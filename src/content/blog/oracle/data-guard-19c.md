---
title: "Create a Data Guard Physical Standby Database Using ASM and OMF in Oracle Database 19c"
description: "Configure a Data Guard physical standby database in Oracle Database 19c using ASM (Automatic Storage Management) and Oracle Managed Files (OMF)."
pubDate: 2025-06-08
tags:
  - Oracle Database
  - Oracle Data Guard
  - Oracle 19c
  - ASM
  - OMF
  - High Availability
---

This document describes how to create a Data Guard physical standby database in Oracle Database 19c using **Automatic Storage Management (ASM)** and **Oracle Managed Files (OMF)**.

Oracle Data Guard provides high availability, disaster recovery, and data protection by maintaining one or more synchronized standby databases. When ASM and OMF are used, database file management is simplified because Oracle automatically creates and manages the required database files.

## Environment

The following environment is used throughout this procedure.

| Role | Hostname | Database |
|------|----------|----------|
| Primary Database | `server-graz` | `graz` |
| Physical Standby Database | `server-salzburg` | `graz` |

Both servers use:

- Oracle Database 19c
- Oracle Grid Infrastructure
- Automatic Storage Management (ASM)
- Oracle Managed Files (OMF)

## Operating System Prerequisites

Before creating the standby database, verify that the following prerequisites are met:

- Configure host name resolution in `/etc/hosts` on both servers.
- Verify that both servers can communicate using host names.
- Install and configure Oracle Grid Infrastructure on the primary and standby servers.
- Install the Oracle Database software on the standby server.
- Verify that the primary database is operational before beginning the Data Guard configuration.

### Verify Host Name Resolution

Verify that the host entries exist on both servers.

Run the following command:

```bash
cat /etc/hosts
```

Example output:

```bash
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.56.10 server-graz
192.168.56.20 server-salzburg
```

### Verify Network Connectivity

Confirm that both servers can communicate using their host names.

Run the following command from the primary server:

```bash
ping server-salzburg
```

Example output:

```bash
PING server-salzburg (192.168.56.20) 56(84) bytes of data.
64 bytes from server-salzburg (192.168.56.20): icmp_seq=1 ttl=64 time=0.400 ms
64 bytes from server-salzburg (192.168.56.20): icmp_seq=2 ttl=64 time=0.213 ms
64 bytes from server-salzburg (192.168.56.20): icmp_seq=3 ttl=64 time=0.202 ms
64 bytes from server-salzburg (192.168.56.20): icmp_seq=4 ttl=64 time=0.178 ms

--- server-salzburg ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
```

## Database Prerequisites

Before creating the physical standby database, verify that the primary database meets the following requirements:

- The database is running in **ARCHIVELOG** mode.
- **FORCE LOGGING** is enabled.
- **Flashback Database** is enabled. Flashback Database is required to reinstate the former primary database after a failover.
- The `STANDBY_FILE_MANAGEMENT` initialization parameter is set to `AUTO`.

The following sections verify each prerequisite before configuring the standby database.

```bash
[oracle@server-graz ~]$ . oraenv <<< graz
ORACLE_SID = [oracle] ? The Oracle base has been set to /u01/app/oracle
[oracle@server-graz ~]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Mon Jun 9 12:17:11 2025
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle.  All rights reserved.


Connected to:
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
Version 19.3.0.0.0

SQL> select force_logging,log_mode,flashback_on from v$database;

FORCE_LOGGING                           LOG_MODE     FLASHBACK_ON
--------------------------------------- ------------ ------------------
NO                                      ARCHIVELOG   NO

SQL> alter database force logging;

Database altered.

SQL> alter database flashback on;

Database altered.

SQL> select force_logging,log_mode,flashback_on from v$database;

FORCE_LOGGING                           LOG_MODE     FLASHBACK_ON
--------------------------------------- ------------ ------------------
YES                                     ARCHIVELOG   YES

SQL> show parameter STANDBY_FILE_MANAGEMENT

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
standby_file_management              string      MANUAL

SQL> alter system set STANDBY_FILE_MANAGEMENT=AUTO scope=both;

System altered.

SQL> show parameter STANDBY_FILE_MANAGEMENT

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
standby_file_management              string      AUTO

alter system set db_file_name_convert = '+DG_DATA/GRAZ','+DG_DATA/SALZBURG' scope=both;
alter system set log_file_name_convert = '+DG_DATA/GRAZ','+DG_DATA/SALZBURG','+DG_FRA/GRAZ','+DG_FRA/SALZBURG' scope=both;
```

## Configure Standby Redo Logs on the Primary Database

Before creating the physical standby database, configure **Standby Redo Logs (SRLs)** on the primary database.

The standby redo log files should be the **same size** as the existing online redo log files.

Creating the standby redo logs on the primary database before configuring Data Guard provides the following benefits:

- The standby redo logs are automatically created on the standby database during the duplication process.
- The primary database is prepared to assume the standby role after a future switchover or failover.

Oracle recommends configuring **one more standby redo log group than the number of online redo log groups per thread**.

In this environment, the primary database contains **three online redo log groups per thread**. Therefore, configure **four standby redo log groups per thread**.

```bash
SQL> set lines 400 pages 200
SQL> col logfile_name form a60
SQL> SELECT
    l.thread#,
    l.group#,
    lf.member AS logfile_name,
    l.bytes / 1024 / 1024 AS size_mb,
    l.status
FROM
    v$log l
JOIN
    v$logfile lf ON l.group# = lf.group#
ORDER BY
    l.thread#, l.group#; 

   THREAD#     GROUP# LOGFILE_NAME                                                    SIZE_MB STATUS
---------- ---------- ------------------------------------------------------------ ---------- ----------------
         1          1 +DG_DATA/GRAZ/ONLINELOG/group_1.258.1203340061                      200 CURRENT
         1          1 +DG_FRA/GRAZ/ONLINELOG/group_1.257.1203340061                       200 CURRENT
         1          2 +DG_DATA/GRAZ/ONLINELOG/group_2.259.1203340061                      200 INACTIVE
         1          2 +DG_FRA/GRAZ/ONLINELOG/group_2.256.1203340061                       200 INACTIVE
         1          3 +DG_DATA/GRAZ/ONLINELOG/group_3.260.1203340061                      200 INACTIVE
         1          3 +DG_FRA/GRAZ/ONLINELOG/group_3.272.1203340061                       200 INACTIVE

6 rows selected.

SQL> select sl.group#, sl.thread#, v$logfile.member, sl.bytes/1024/1024 size_mb
from v$logfile, v$standby_log sl
where v$logfile.group# = sl.group#
order by sl.thread#, sl.group#, member;  

no rows selected

SQL> alter database add standby logfile thread 1 size 200M;

Database altered.

SQL> r
  1* alter database add standby logfile thread 1 size 200M

Database altered.

SQL> r
  1* alter database add standby logfile thread 1 size 200M

Database altered.

SQL> r
  1* alter database add standby logfile thread 1 size 200M

Database altered.


SQL> col member form a60
SQL> r
  1  select sl.group#, sl.thread#, v$logfile.member, sl.bytes/1024/1024 size_mb
  2  from v$logfile, v$standby_log sl
  3  where v$logfile.group# = sl.group#
  4* order by sl.thread#, sl.group#, member

    GROUP#    THREAD# MEMBER                                                          SIZE_MB
---------- ---------- ------------------------------------------------------------ ----------
         4          1 +DG_DATA/GRAZ/ONLINELOG/group_4.267.1203357795                      200
         4          1 +DG_FRA/GRAZ/ONLINELOG/group_4.280.1203357795                       200
         5          1 +DG_DATA/GRAZ/ONLINELOG/group_5.268.1203357795                      200
         5          1 +DG_FRA/GRAZ/ONLINELOG/group_5.279.1203357795                       200
         6          1 +DG_DATA/GRAZ/ONLINELOG/group_6.269.1203357797                      200
         6          1 +DG_FRA/GRAZ/ONLINELOG/group_6.278.1203357797                       200
         7          1 +DG_DATA/GRAZ/ONLINELOG/group_7.270.1203357797                      200
         7          1 +DG_FRA/GRAZ/ONLINELOG/group_7.277.1203357797                       200

8 rows selected.
```

## Configure Oracle Net Services

Configure the Oracle Net configuration files on both the **primary** and **standby** servers.

The following configuration creates the network aliases required for Data Guard communication and Oracle Data Guard Broker.

### Configure `listener.ora`

Update the `listener.ora` file on both servers to include static service registrations for the primary and standby databases.

The static services with the `_DGMGRL` suffix are used by Oracle Data Guard Broker to connect to the databases, including when an instance is not fully open.

Example configuration:

```text
LISTENER =
(DESCRIPTION_LIST =
  (DESCRIPTION =
    (ADDRESS = (PROTOCOL = TCP)(HOST = server-graz)(PORT = 1521))
    (ADDRESS = (PROTOCOL = IPC)(KEY = EXTPROC1521))
  )
)

SID_LIST_LISTENER =
(SID_LIST =
  (SID_DESC =
    (GLOBAL_DBNAME = graz_DGMGRL)
    (SID_NAME = graz)
    (ORACLE_HOME = /u01/app/oracle/product/19/dbhome_1)
  )
  (SID_DESC =
    (GLOBAL_DBNAME = salzburg_DGMGRL)
    (SID_NAME = salzburg)
    (ORACLE_HOME = /u01/app/oracle/product/19/dbhome_1)
  )
)
```

### Restart the Listener

After updating the listener configuration, restart the Oracle Net Listener.

Run the following commands:

```bash
srvctl stop listener
srvctl start listener
```

### Verify the Listener Configuration

Verify that the listener is running and that the Data Guard Broker services are registered.

Run the following command:

```bash
lsnrctl status
```

Verify that the output contains both Data Guard Broker services:

```bash
Service "graz_DGMGRL" has 1 instance(s).
Instance "graz", status UNKNOWN, has 1 handler(s).

Service "salzburg_DGMGRL" has 1 instance(s).
Instance "salzburg", status UNKNOWN, has 1 handler(s).
```

> It is expected for the static `_DGMGRL` services to display a status of `UNKNOWN`. These services are statically registered and are required by Oracle Data Guard Broker.

### Configure `tnsnames.ora`

Configure the `tnsnames.ora` file on both servers with connect descriptors for the primary database, standby database, and the corresponding Data Guard Broker services.

Example configuration:

```text
GRAZ =
(DESCRIPTION =
  (ADDRESS = (PROTOCOL = TCP)(HOST = server-graz)(PORT = 1521))
  (CONNECT_DATA =
    (SERVER = DEDICATED)
    (SERVICE_NAME = graz)
  )
)

SALZBURG =
(DESCRIPTION =
  (ADDRESS = (PROTOCOL = TCP)(HOST = server-salzburg)(PORT = 1521))
  (CONNECT_DATA =
    (SERVER = DEDICATED)
    (SERVICE_NAME = salzburg)
  )
)

GRAZ_DGMGRL =
(DESCRIPTION =
  (ADDRESS = (PROTOCOL = TCP)(HOST = server-graz)(PORT = 1521))
  (CONNECT_DATA =
    (SERVER = DEDICATED)
    (SERVICE_NAME = graz_DGMGRL)
  )
)

SALZBURG_DGMGRL =
(DESCRIPTION =
  (ADDRESS = (PROTOCOL = TCP)(HOST = server-salzburg)(PORT = 1521))
  (CONNECT_DATA =
    (SERVER = DEDICATED)
    (SERVICE_NAME = salzburg_DGMGRL)
  )
)
```

### Validate Oracle Net Connectivity

After updating the Oracle Net configuration, verify that both databases can be resolved through Oracle Net Services.

Run the following commands from both servers:

```bash
tnsping GRAZ_DGMGRL
tnsping SALZBURG_DGMGRL
```

Verify that each command returns a successful response before continuing with the Data Guard configuration.

```bash
[oracle@server-graz ~]$ tnsping salzburg_DGMGRL

TNS Ping Utility for Linux: Version 19.0.0.0.0 - Production on 09-JUN-2025 18:25:18

Copyright (c) 1997, 2019, Oracle.  All rights reserved.

Used parameter files:


Used TNSNAMES adapter to resolve the alias
Attempting to contact (DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = server-salzburg)(PORT = 1521)) (CONNECT_DATA = (SERVER = DEDICATED) (SERVICE_NAME = salzburg)))
OK (0 msec)
```

## Prepare the Standby PFILE

Create a parameter file (PFILE) from the primary database, copy the password file to the standby server, and modify the initialization parameters for the standby database.

The `DB_NAME` initialization parameter must be identical on the primary and all standby databases.

Databases that share the same `DB_NAME` within the same `DB_DOMAIN`, such as physical standby databases, must have a unique `DB_UNIQUE_NAME`.

### Create a PFILE on the Primary Database

Create a PFILE from the current server parameter file (SPFILE).

Run the following commands:

```bash
[oracle@server-graz dbs]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Sun Jun 15 18:42:00 2025
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle.  All rights reserved.


Connected to:
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
Version 19.3.0.0.0

SQL> create pfile='$ORACLE_HOME/dbs/stby.ora' from spfile;

File created.


[oracle@server-graz dbs]$ scp orapwgraz oracle@192.168.56.20:/u01/app/oracle/product/19/dbhome_1/dbs/orapwsalzburg
oracle@192.168.56.20's password:
orapwgraz                                                                                                                                                                   100% 2048     5.0MB/s   00:00
[oracle@server-graz dbs]$ scp stby.ora oracle@192.168.56.20:/u01/app/oracle/product/19/dbhome_1/dbs/initsalzburg.ora
oracle@192.168.56.20's password:
stby.ora                                                                                                                                                                    100% 1189     2.7MB/s   00:00
[oracle@server-salzburg ~]$ mkdir -p /u01/app/oracle/admin/salzburg/adump
[oracle@server-salzburg ~]$ cat /u01/app/oracle/product/19/dbhome_1/dbs/initsalzburg.ora
*.audit_file_dest='/u01/app/oracle/admin/salzburg/adump'
*.audit_trail='db'
*.compatible='19.0.0'
*.db_block_size=8192
*.db_create_file_dest='+DG_DATA'
*.db_name='graz'
*.db_unique_name='salzburg'
*.db_recovery_file_dest='+DG_FRA'
*.db_recovery_file_dest_size=7851m
*.diagnostic_dest='/u01/app/oracle'
*.log_archive_format='%t_%s_%r.dbf'
*.nls_language='AMERICAN'
*.nls_territory='AMERICA'
*.open_cursors=300
*.pga_aggregate_target=1637m
*.processes=720
*.remote_login_passwordfile='EXCLUSIVE'
*.sga_target=4908m
*.standby_file_management='AUTO'
*.undo_tablespace='UNDOTBS1'
*.log_file_name_convert='+DG_DATA/SALZBURG','+DG_DATA/GRAZ','+DG_FRA/SALZBURG','+DG_FRA/GRAZ'
*.db_file_name_convert='+DG_DATA/SALZBURG','+DG_DATA/GRAZ'
```

## Register the Standby Database with Oracle Clusterware

Register the standby database as a Clusterware resource before creating the standby database.

```bash
[oracle@server-salzburg ~]$ export ORACLE_HOME=/u01/app/oracle/product/19/dbhome_1
[oracle@server-salzburg ~]$ export ORACLE_SID=salzburg
[oracle@server-salzburg ~]$ export PATH=$ORACLE_HOME/bin:$PATH
[oracle@server-salzburg ~]$ srvctl add database -db salzburg -oraclehome $ORACLE_HOME -instance $ORACLE_SID -dbname $ORACLE_SID -diskgroup DG_DATA,DG_FRA -role physical_standby -startoption mount
[oracle@server-salzburg ~]$ srvctl config database -db salzburg
Database unique name: salzburg
Database name: salzburg
Oracle home: /u01/app/oracle/product/19/dbhome_1
Oracle user: oracle
Spfile: 
Password file: 
Domain:
Start options: mount
Stop options: immediate
Database role: PHYSICAL_STANDBY
Management policy: AUTOMATIC
Disk Groups: DG_DATA,DG_FRA
Services:
OSDBA group:
OSOPER group:
Database instance: salzburg
```

## Start the Standby Instance

Start the standby database in the `NOMOUNT` state using the initialization parameter file (PFILE).

```bash
[oracle@server-salzburg ~]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Mon Jun 9 22:48:59 2025
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle.  All rights reserved.


Connected to:
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
Version 19.3.0.0.0

SQL> startup nomount;
ORACLE instance started.

Total System Global Area 5150603736 bytes
Fixed Size                  8907224 bytes
Variable Size             939524096 bytes
Database Buffers         4194304000 bytes
Redo Buffers                7868416 bytes

[oracle@server-salzburg ~]$ ps -ef | grep smon
oracle      3391       1  0 17:58 ?        00:00:00 asm_smon_+ASM
oracle     11825       1  0 19:39 ?        00:00:00 ora_smon_salzburg
oracle     13175   12038  0 19:42 pts/0    00:00:00 grep --color=auto smon
```

## Create the Server Parameter File

After verifying that the standby instance starts successfully using the PFILE, create a server parameter file (SPFILE) in ASM.

### Create the SPFILE

Run the following command:

```bash
SQL> create spfile from pfile;
```

### Verify the SPFILE Location

Locate the newly created SPFILE in ASM.

```bash
[oracle@server-salzburg ~]$ . oraenv <<< +ASM
[oracle@server-salzburg ~]$ asmcmd
ASMCMD> lsdg
State    Type    Rebal  Sector  Logical_Sector  Block       AU  Total_MB  Free_MB  Req_mir_free_MB  Usable_file_MB  Offline_disks  Voting_files  Name
MOUNTED  EXTERN  N         512             512   4096  4194304     51196    48608                0           48608              0             N  DG_DATA/
MOUNTED  EXTERN  N         512             512   4096  4194304     51196    51100                0           51100              0             N  DG_FRA/
ASMCMD> cd dg_data
ASMCMD> ls
ASM/
SALZBURG/
orapwasm
spfilesalzburg.ora
ASMCMD> ls -l spfilesalzburg.ora
Type           Redund  Striped  Time             Sys  Name
PARAMETERFILE  UNPROT  COARSE   JUN 09 22:00:00  N    spfilesalzburg.ora => +DG_DATA/SALZBURG/PARAMETERFILE/spfile.261.1203374813
```

### Update the Clusterware Configuration

Update the Oracle Clusterware configuration to reference the SPFILE stored in ASM.

Run the following command:

```bash
[oracle@server-salzburg ~]$ srvctl modify database -db salzburg -spfile +DG_DATA/SALZBURG/PARAMETERFILE/spfile.261.1203374813
[oracle@server-graz dbs]$ sqlplus / as sysdba
SQL> startup nomount force;
ORACLE instance started.

Total System Global Area 5150603736 bytes
Fixed Size                  8907224 bytes
Variable Size             939524096 bytes
Database Buffers         4194304000 bytes
Redo Buffers                7868416 bytes
```

## Duplicate the Standby Database

After the standby instance has been started in the `NOMOUNT` state, use RMAN to create the physical standby database by duplicating the primary database.

> Use the `NOFILENAMECHECK` option only when the primary and standby databases reside on different servers or use separate storage. Specifying this option incorrectly can result in existing database files being overwritten.

For detailed information about the `DUPLICATE` command and the `NOFILENAMECHECK` option, refer to the [Oracle Database Backup and Recovery Reference documentation](https://docs.oracle.com/en/database/oracle/oracle-database/19/rcmrf/DUPLICATE.html).

Run the following commands:
```bash
[oracle@server-salzburg ~]$ rman target sys/*******@graz_DGMGRL auxiliary sys/*******@salzburg_DGMGRL

Recovery Manager: Release 19.0.0.0.0 - Production on Mon Jun 9 22:53:31 2025
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

connected to target database: GRAZ (DBID=3282927897)
connected to auxiliary database: GRAZ (not mounted)

RMAN> duplicate target database for standby from active database nofilenamecheck;

Starting Duplicate Db at 09-JUN-25
using target database control file instead of recovery catalog
allocated channel: ORA_AUX_DISK_1
channel ORA_AUX_DISK_1: SID=743 device type=DISK

contents of Memory Script:
{
   backup as copy reuse
   passwordfile auxiliary format  '/u01/app/oracle/product/19/dbhome_1/dbs/orapwsalzburg'   ;
}
executing Memory Script

Starting backup at 09-JUN-25
allocated channel: ORA_DISK_1
channel ORA_DISK_1: SID=747 device type=DISK
Finished backup at 09-JUN-25

contents of Memory Script:
{
   sql clone "create spfile from memory";
   shutdown clone immediate;
   startup clone nomount;
   restore clone from service  'graz_DGMGRL' standby controlfile;
}
executing Memory Script

sql statement: create spfile from memory

Oracle instance shut down

connected to auxiliary database (not started)
Oracle instance started

Total System Global Area    5150603736 bytes

Fixed Size                     8907224 bytes
Variable Size                939524096 bytes
Database Buffers            4194304000 bytes
Redo Buffers                   7868416 bytes

Starting restore at 09-JUN-25
allocated channel: ORA_AUX_DISK_1
channel ORA_AUX_DISK_1: SID=743 device type=DISK

channel ORA_AUX_DISK_1: starting datafile backup set restore
channel ORA_AUX_DISK_1: using network backup set from service graz_DGMGRL
channel ORA_AUX_DISK_1: restoring control file
channel ORA_AUX_DISK_1: restore complete, elapsed time: 00:00:02
output file name=+DG_DATA/SALZBURG/CONTROLFILE/current.261.1203375263
output file name=+DG_FRA/SALZBURG/CONTROLFILE/current.259.1203375263
Finished restore at 09-JUN-25

contents of Memory Script:
{
   sql clone 'alter database mount standby database';
}
executing Memory Script

sql statement: alter database mount standby database
RMAN-05158: WARNING: auxiliary (datafile) file name +DG_DATA/GRAZ/DATAFILE/system.261.1203340061 conflicts with a file used by the target database
RMAN-05529: warning: DB_FILE_NAME_CONVERT resulted in invalid ASM names; names changed to disk group only.
RMAN-05158: WARNING: auxiliary (datafile) file name +DG_DATA/GRAZ/DATAFILE/sysaux.262.1203340063 conflicts with a file used by the target database
RMAN-05158: WARNING: auxiliary (datafile) file name +DG_DATA/GRAZ/DATAFILE/undotbs1.263.1203340065 conflicts with a file used by the target database
RMAN-05158: WARNING: auxiliary (datafile) file name +DG_DATA/GRAZ/DATAFILE/users.265.1203340067 conflicts with a file used by the target database
RMAN-05158: WARNING: auxiliary (tempfile) file name +DG_DATA/GRAZ/TEMPFILE/temp.264.1203340065 conflicts with a file used by the target database

contents of Memory Script:
{
   set newname for tempfile  1 to
 "+DG_DATA";
   switch clone tempfile all;
   set newname for datafile  1 to
 "+DG_DATA";
   set newname for datafile  2 to
 "+DG_DATA";
   set newname for datafile  3 to
 "+DG_DATA";
   set newname for datafile  4 to
 "+DG_DATA";
   restore
   from  nonsparse   from service
 'graz_DGMGRL'   clone database
   ;
   sql 'alter system archive log current';
}
executing Memory Script

executing command: SET NEWNAME

renamed tempfile 1 to +DG_DATA in control file

executing command: SET NEWNAME

executing command: SET NEWNAME

executing command: SET NEWNAME

executing command: SET NEWNAME

Starting restore at 09-JUN-25
using channel ORA_AUX_DISK_1

channel ORA_AUX_DISK_1: starting datafile backup set restore
channel ORA_AUX_DISK_1: using network backup set from service graz_DGMGRL
channel ORA_AUX_DISK_1: specifying datafile(s) to restore from backup set
channel ORA_AUX_DISK_1: restoring datafile 00001 to +DG_DATA
channel ORA_AUX_DISK_1: restore complete, elapsed time: 00:00:07
channel ORA_AUX_DISK_1: starting datafile backup set restore
channel ORA_AUX_DISK_1: using network backup set from service graz_DGMGRL
channel ORA_AUX_DISK_1: specifying datafile(s) to restore from backup set
channel ORA_AUX_DISK_1: restoring datafile 00002 to +DG_DATA
channel ORA_AUX_DISK_1: restore complete, elapsed time: 00:00:03
channel ORA_AUX_DISK_1: starting datafile backup set restore
channel ORA_AUX_DISK_1: using network backup set from service graz_DGMGRL
channel ORA_AUX_DISK_1: specifying datafile(s) to restore from backup set
channel ORA_AUX_DISK_1: restoring datafile 00003 to +DG_DATA
channel ORA_AUX_DISK_1: restore complete, elapsed time: 00:00:01
channel ORA_AUX_DISK_1: starting datafile backup set restore
channel ORA_AUX_DISK_1: using network backup set from service graz_DGMGRL
channel ORA_AUX_DISK_1: specifying datafile(s) to restore from backup set
channel ORA_AUX_DISK_1: restoring datafile 00004 to +DG_DATA
channel ORA_AUX_DISK_1: restore complete, elapsed time: 00:00:01
Finished restore at 09-JUN-25

sql statement: alter system archive log current

contents of Memory Script:
{
   switch clone datafile all;
}
executing Memory Script

datafile 1 switched to datafile copy
input datafile copy RECID=5 STAMP=1203375281 file name=+DG_DATA/SALZBURG/DATAFILE/system.262.1203375269
datafile 2 switched to datafile copy
input datafile copy RECID=6 STAMP=1203375281 file name=+DG_DATA/SALZBURG/DATAFILE/sysaux.263.1203375275
datafile 3 switched to datafile copy
input datafile copy RECID=7 STAMP=1203375281 file name=+DG_DATA/SALZBURG/DATAFILE/undotbs1.264.1203375279
datafile 4 switched to datafile copy
input datafile copy RECID=8 STAMP=1203375281 file name=+DG_DATA/SALZBURG/DATAFILE/users.265.1203375279
Finished Duplicate Db at 09-JUN-25
```

## Configure Oracle Data Guard Broker

After the physical standby database has been created, configure Oracle Data Guard Broker to manage the Data Guard configuration.

By default, the broker configuration files are stored in the Oracle home. Although Oracle supports storing the broker configuration files in ASM, this procedure uses the default location.

### Enable Oracle Data Guard Broker

Enable the Data Guard Broker on both the primary and standby databases.

Run the following command on each database:

```bash
SQL> alter system set dg_broker_start=true scope=both;

System altered.
```

### Create the Broker Configuration

Connect to the primary database using the Data Guard Broker command-line interface (`DGMGRL`) and create the broker configuration.

Run the following commands:

```bash
[oracle@server-graz ~]$ dgmgrl sys/**********
DGMGRL for Linux: Release 19.0.0.0.0 - Production on Sun Jun 15 16:01:26 2025
Version 19.3.0.0.0

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

Welcome to DGMGRL, type "help" for information.
Connected to "graz"
Connected as SYSDBA.
DGMGRL> create configuration 'stbyconf' as primary database is 'graz' connect identifier is graz;
Configuration "stbycong" created with primary database "graz"
DGMGRL> add database 'salzburg' as connect identifier is salzburg maintained as physical;
Database "salzburg" added
```

### Enable the Broker Configuration

Enable the Data Guard Broker configuration.

> Immediately after enabling the configuration, Oracle may report temporary warnings while the broker validates the primary and standby databases.


Run the following commands:

```bash
DGMGRL> show configuration;

Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  graz     - Primary database
    salzburg - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
DISABLED

DGMGRL> enable configuration;
Enabled.
DGMGRL> show configuration;

Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  graz     - Primary database
    salzburg - Physical standby database
      Warning: ORA-16809: multiple warnings detected for the member

Fast-Start Failover:  Disabled

Configuration Status:
WARNING   (status updated 31 seconds ago)

DGMGRL>
DGMGRL> show configuration;

Configuration - stbyconf

  Protection Mode: MaxPerformance
  Members:
  graz     - Primary database
    salzburg - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 34 seconds ago)
```