---
title: "Rename an Oracle Database Using the NID Utility"
description: "Rename an Oracle Database 19c database using the DBNEWID (NID) utility without changing the DBID, and update the database, Clusterware, ASM, and network configuration."
pubDate: 2025-10-20
tags:
  - Oracle Database
  - Oracle Database 19c
  - DBNEWID
  - NID
  - Oracle Clusterware
---

Renaming an Oracle Database might be required when moving environments, restructuring systems, or aligning database naming conventions.

This guide demonstrates how to rename an **Oracle Database 19c** database using the **DBNEWID (NID)** utility. In this example, the database name is changed while the existing **DBID** is retained.

## Important Considerations

Changing the database name without changing the **DBID** does not require opening the database with the `RESETLOGS` option. Existing backups and archived redo logs therefore remain valid.

However, changing the database name requires additional configuration changes. In particular:

- The `DB_NAME` initialization parameter must be updated to match the new database name.
- The Oracle password file must be recreated for the renamed database.
- Oracle Clusterware configuration must be updated.
- Static listener and Oracle Net configuration might require changes.
- ASM file names can optionally be updated to reflect the new database name.

If a control file backup created before the database rename is restored, use the corresponding initialization and password files from that period.

> **Important:** Create and verify a complete database backup before starting the database rename procedure.

## Environment Overview

The following environment is used in this example:

| Component | Value |
| --- | --- |
| Host | `host02` |
| Source database | `TEST` |
| Target database | `DUP` |

The **DBNEWID (NID)** utility is used to rename the existing database from `TEST` to `DUP`.

## Back Up the Database

Before renaming the database, create a complete backup.

The backup should provide sufficient recoverability in case an issue occurs during the database rename or subsequent configuration changes.

## Set the Oracle Environment

Set the Oracle environment for the source database:

```bash
[oracle@host02 dbs]$ . oraenv <<< TEST
ORACLE_SID = [TEST] ? The Oracle base remains unchanged with value /u01/app/oracle
```

Verify that the Oracle environment points to the `TEST` database before continuing.

## Start the Database in MOUNT Mode

Connect to the source database as `SYSDBA`:

```bash
[oracle@host02 ~]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Mon Oct 20 18:52:31 2025
Version 19.28.0.0.0

Copyright (c) 1982, 2025, Oracle.  All rights reserved.

Connected to:
Oracle Database 19c Standard Edition 2 Release 19.0.0.0.0 - Production
Version 19.28.0.0.0
```

Shut down the database:

```sql
SQL> shutdown immediate;
Database closed.
Database dismounted.
ORACLE instance shut down.
```

Start the database in `MOUNT` mode:

```sql
SQL> startup mount
ORACLE instance started.

Total System Global Area 4630510656 bytes
Fixed Size                  8948800 bytes
Variable Size             855638016 bytes
Database Buffers         3758096384 bytes
Redo Buffers                7827456 bytes
Database mounted.
```

Exit SQL*Plus:

```sql
SQL> exit
```

## Rename the Database Using NID

Run the DBNEWID utility and specify the new database name.

The `SETNAME=YES` option instructs DBNEWID to change the database name without changing the DBID.

```bash
[oracle@host02 ~]$ nid TARGET=SYS/Welcome1 DBNAME=DUP SETNAME=YES
```

Example output:

```text
DBNEWID: Release 19.0.0.0.0 - Production on Mon Oct 20 18:53:37 2025

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

Connected to database TEST (DBID=2513098100)

Connected to server version 19.28.0

Control Files in database:
    +DATA/TEST/CONTROLFILE/current.258.1214951577
    +RECO/TEST/CONTROLFILE/current.256.1214951577

Change database name of database TEST to DUP? (Y/[N]) => Y

Proceeding with operation
Changing database name from TEST to DUP
    Control File +DATA/TEST/CONTROLFILE/current.258.1214951577 - modified
    Control File +RECO/TEST/CONTROLFILE/current.256.1214951577 - modified
    Datafile +DATA/TEST/DATAFILE/system.260.121495161 - wrote new name
    Datafile +DATA/TEST/DATAFILE/sysaux.261.121495161 - wrote new name
    Datafile +DATA/TEST/DATAFILE/undotbs1.262.121495162 - wrote new name
    Datafile +DATA/TEST/DATAFILE/users.263.121495162 - wrote new name
    Datafile +DATA/TEST/TEMPFILE/temp.267.121495167 - wrote new name
    Control File +DATA/TEST/CONTROLFILE/current.258.1214951577 - wrote new name
    Control File +RECO/TEST/CONTROLFILE/current.256.1214951577 - wrote new name
    Instance shut down

Database name changed to DUP.
Modify parameter file and generate a new password file before restarting.
Succesfully changed database name.
DBNEWID - Completed succesfully.
```

The database name is now changed from `TEST` to `DUP`. Because `SETNAME=YES` was specified, the existing DBID is retained.

The DBNEWID output also indicates that the initialization parameters and password file must be updated before restarting the database.

## Update the Database Parameters

Start the instance in `NOMOUNT` mode:

```sql
SQL> startup nomount
ORACLE instance started.

Total System Global Area 4630510656 bytes
Fixed Size                  8948800 bytes
Variable Size             855638016 bytes
Database Buffers         3758096384 bytes
Redo Buffers                7827456 bytes
```

Verify the SPFILE location and the current database-related parameters:

```sql
SQL> show parameter spfile

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
spfile                               string      +DATA/TEST/PARAMETERFILE/spfil
                                                 e.257.1214940327
```

```sql
SQL> show parameter name

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
cdb_cluster_name                     string
cell_offloadgroup_name               string
db_file_name_convert                 string
db_name                              string      TEST
db_unique_name                       string      TEST
global_names                         boolean     FALSE
instance_name                        string      TEST
lock_name_space                      string
log_file_name_convert                string
mfa_sender_email_displayname         string
pdb_file_name_convert                string

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
processor_group_name                 string
service_names                        string      TEST
```

Update `DB_NAME`:

```sql
SQL> alter system set db_name='DUP' scope=spfile;

System altered.
```

Update the instance name:

```sql
SQL> alter system set instance_name='DUP' scope=spfile;

System altered.
```

## Recreate the Password File

Change to the Oracle Database password-file directory:

```bash
[oracle@host02 ~]$ cd $ORACLE_HOME/dbs
```

Create a password file for the renamed database:

```bash
[oracle@host02 dbs]$ orapwd file=orapwDUP password=Welcome1 force=y format=12
```

> **Note:** The password shown in this example is taken from the original demonstration environment. Use an appropriate password that complies with the security requirements of your environment.

## Start the Renamed Database

Connect to SQL*Plus:

```bash
[oracle@host02 dbs]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Mon Oct 20 18:57:07 2025
Version 19.28.0.0.0

Copyright (c) 1982, 2025, Oracle.  All rights reserved.

Connected to:
Oracle Database 19c Standard Edition 2 Release 19.0.0.0.0 - Production
Version 19.28.0.0.0
```

Restart the instance and mount the database:

```sql
SQL> shutdown immediate;
ORA-01507: database not mounted

ORACLE instance shut down.

SQL> startup mount
ORACLE instance started.

Total System Global Area 4630510656 bytes
Fixed Size                  8948800 bytes
Variable Size             855638016 bytes
Database Buffers         3758096384 bytes
Redo Buffers                7827456 bytes
Database mounted.
```

Open the database:

```sql
SQL> alter database open;

Database altered.
```

Verify the database parameters:

```sql
SQL> show parameter name

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
cdb_cluster_name                     string
cell_offloadgroup_name               string
db_file_name_convert                 string
db_name                              string      DUP
db_unique_name                       string      DUP
global_names                         boolean     FALSE
instance_name                        string      DUP
lock_name_space                      string
log_file_name_convert                string
mfa_sender_email_displayname         string
pdb_file_name_convert                string

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
processor_group_name                 string
service_names                        string      DUP
```

The database is now running with the new database name `DUP`.

## Update the Oracle Clusterware Configuration

After renaming the database, update the Oracle Clusterware configuration so that it references the new database and instance name.

Verify the currently running instance:

```bash
[oracle@host02 dbs]$ ps -ef | grep smon
oracle      2246       1  0 17:56 ?        00:00:00 asm_smon_+ASM
oracle     31316       1  0 19:19 ?        00:00:00 ora_smon_TEST
oracle     33477    2904  0 19:23 pts/0    00:00:00 grep --color=auto smon
```

Set the Oracle environment for the original instance:

```bash
[oracle@host02 dbs]$ . oraenv
ORACLE_SID = [DUP] ? TEST
The Oracle base remains unchanged with value /u01/app/oracle
```

Connect to the database and shut it down:

```bash
[oracle@host02 dbs]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Mon Oct 20 19:23:38 2025
Version 19.28.0.0.0

Copyright (c) 1982, 2025, Oracle.  All rights reserved.

Connected to:
Oracle Database 19c Standard Edition 2 Release 19.0.0.0.0 - Production
Version 19.28.0.0.0

SQL> shutdown immediate;
Database closed.
Database dismounted.
ORACLE instance shut down.

SQL> exit
```

Review the existing Clusterware configuration:

```bash
[oracle@host02 dbs]$ srvctl config database -db DUP
Database unique name: DUP
Database name: TEST
Oracle home: /u01/app/oracle/product/19/dbhome_1/
Oracle user: oracle
Spfile: +DATA/TEST/PARAMETERFILE/spfile.257.1214940327
Password file:
Domain:
Start options: open
Stop options: immediate
Database role: PRIMARY
Management policy: AUTOMATIC
Disk Groups: DATA,RECO
Services:
OSDBA group:
OSOPER group:
Database instance: TEST
```

Remove the existing Clusterware database resource:

```bash
[oracle@host02 dbs]$ srvctl stop database -db TEST
PRCC-1016 : TEST was already stopped

[oracle@host02 dbs]$ srvctl remove database -db TEST
Remove the database TEST? (y/[n]) y
```

Verify `ORACLE_HOME` and set `ORACLE_SID` to the new database name:

```bash
[oracle@host02 dbs]$ echo $ORACLE_HOME
/u01/app/oracle/product/19/dbhome_1/

[oracle@host02 dbs]$ export ORACLE_SID=DUP

[oracle@host02 dbs]$ echo $ORACLE_SID
DUP
```

Add the renamed database to Oracle Clusterware:

```bash
[oracle@host02 dbs]$ srvctl add database \
    -db DUP \
    -oraclehome $ORACLE_HOME \
    -instance $ORACLE_SID \
    -dbname $ORACLE_SID \
    -diskgroup DATA,RECO \
    -role primary \
    -startoption open \
    -spfile +DATA/TEST/PARAMETERFILE/spfile.257.1214940327
```

Start the database:

```bash
[oracle@host02 dbs]$ srvctl start database -db DUP
```

Verify that the instance is running under the new name:

```bash
[oracle@host02 dbs]$ ps -ef | grep smon
oracle      2246       1  0 17:56 ?        00:00:00 asm_smon_+ASM
oracle     36335       1  0 19:28 ?        00:00:00 ora_smon_DUP
oracle     37673    2904  0 19:31 pts/0    00:00:00 grep --color=auto smon
```

The database is now registered with Oracle Clusterware using the new database and instance name `DUP`.

## Update the ASM File Locations

Although the database has been renamed, some ASM files can still reside under directories associated with the original `TEST` database.

In this example, RMAN is used to create image copies of the database files under the new `DUP` ASM directory and switch the database to the new copies.

Connect to RMAN:

```bash
[oracle@host02 trace]$ rman target /

Recovery Manager: Release 19.0.0.0.0 - Production on Mon Oct 20 22:58:11 2025
Version 19.28.0.0.0

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

connected to target database: DUP (DBID=2513098100)
```

Shut down the database and start it in `MOUNT` mode:

```text
RMAN> shutdown immediate;

database closed
database dismounted
Oracle instance shut down

RMAN> startup mount

connected to target database (not started)
Oracle instance started
database mounted

Total System Global Area    4630510656 bytes

Fixed Size                     8948800 bytes
Variable Size                855638016 bytes
Database Buffers            3758096384 bytes
Redo Buffers                   7827456 bytes
```

Create image copies of the database in the `+DATA` disk group:

```text
RMAN> BACKUP AS COPY DATABASE FORMAT '+DATA';

Starting backup at 20-OCT-25
allocated channel: ORA_DISK_1
channel ORA_DISK_1: SID=9 device type=DISK
channel ORA_DISK_1: starting datafile copy
input datafile file number=00001 name=+RECO/DUP/DATAFILE/system.269.1215039163
output file name=+DATA/DUP/DATAFILE/system.268.1215039533 tag=TAG20251020T225852 RECID=16 STAMP=1215039533
channel ORA_DISK_1: datafile copy complete, elapsed time: 00:00:03
channel ORA_DISK_1: starting datafile copy
input datafile file number=00002 name=+RECO/DUP/DATAFILE/sysaux.270.1215039165
output file name=+DATA/DUP/DATAFILE/sysaux.269.1215039535 tag=TAG20251020T225852 RECID=17 STAMP=1215039536
channel ORA_DISK_1: datafile copy complete, elapsed time: 00:00:03
channel ORA_DISK_1: starting datafile copy
input datafile file number=00003 name=+RECO/DUP/DATAFILE/undotbs1.271.1215039169
output file name=+DATA/DUP/DATAFILE/undotbs1.270.1215039539 tag=TAG20251020T225852 RECID=18 STAMP=1215039539
channel ORA_DISK_1: datafile copy complete, elapsed time: 00:00:03
channel ORA_DISK_1: starting datafile copy
input datafile file number=00004 name=+RECO/DUP/DATAFILE/users.262.1215039171
output file name=+DATA/DUP/DATAFILE/users.271.1215039541 tag=TAG20251020T225852 RECID=19 STAMP=1215039541
channel ORA_DISK_1: datafile copy complete, elapsed time: 00:00:01
Finished backup at 20-OCT-25

Starting Control File and SPFILE Autobackup at 20-OCT-25
piece handle=+RECO/DUP/AUTOBACKUP/2025_10_20/s_1215039499.272.1215039543 comment=NONE
Finished Control File and SPFILE Autobackup at 20-OCT-25
```

Verify the available datafile copies:

```text
RMAN> list copy of database;

List of Datafile Copies
=======================

Key     File S Completion Time Ckp SCN    Ckp Time        Sparse
------- ---- - --------------- ---------- --------------- ------
16      1    A 20-OCT-25       1194664    20-OCT-25       NO
        Name: +DATA/DUP/DATAFILE/system.268.1215039533
        Tag: TAG20251020T225852

12      1    A 20-OCT-25       1193168    20-OCT-25       NO
        Name: +DATA/TEST/DATAFILE/system.260.1214951615

4       1    A 20-OCT-25       1192842    20-OCT-25       NO
        Name: +RECO/DUP/DATAFILE/system.264.1215039055
        Tag: TAG20251020T225055

17      2    A 20-OCT-25       1194664    20-OCT-25       NO
        Name: +DATA/DUP/DATAFILE/sysaux.269.1215039535
        Tag: TAG20251020T225852

13      2    A 20-OCT-25       1193168    20-OCT-25       NO
        Name: +DATA/TEST/DATAFILE/sysaux.261.1214951619

5       2    A 20-OCT-25       1192848    20-OCT-25       NO
        Name: +RECO/DUP/DATAFILE/sysaux.265.1215039059
        Tag: TAG20251020T225055

18      3    A 20-OCT-25       1194664    20-OCT-25       NO
        Name: +DATA/DUP/DATAFILE/undotbs1.270.1215039539
        Tag: TAG20251020T225852

14      3    A 20-OCT-25       1193168    20-OCT-25       NO
        Name: +DATA/TEST/DATAFILE/undotbs1.262.1214951621

6       3    A 20-OCT-25       1192851    20-OCT-25       NO
        Name: +RECO/DUP/DATAFILE/undotbs1.266.1215039063
        Tag: TAG20251020T225055

19      4    A 20-OCT-25       1194664    20-OCT-25       NO
        Name: +DATA/DUP/DATAFILE/users.271.1215039541
        Tag: TAG20251020T225852

15      4    A 20-OCT-25       1193168    20-OCT-25       NO
        Name: +DATA/TEST/DATAFILE/users.263.1214951625

7       4    A 20-OCT-25       1192854    20-OCT-25       NO
        Name: +RECO/DUP/DATAFILE/users.267.1215039065
        Tag: TAG20251020T225055
```

Switch the database to the newly created copies:

```text
RMAN> SWITCH DATABASE TO COPY;

datafile 1 switched to datafile copy "+DATA/DUP/DATAFILE/system.268.1215039533"
datafile 2 switched to datafile copy "+DATA/DUP/DATAFILE/sysaux.269.1215039535"
datafile 3 switched to datafile copy "+DATA/DUP/DATAFILE/undotbs1.270.1215039539"
datafile 4 switched to datafile copy "+DATA/DUP/DATAFILE/users.271.1215039541"
```

Open the database:

```text
RMAN> alter database open;

Statement processed

RMAN> exit

Recovery Manager complete.
```

## Verify the Datafile Locations

Set the Oracle environment and connect to the renamed database:

```bash
[oracle@host02 trace]$ . oraenv
ORACLE_SID = [DUP] ?
The Oracle base remains unchanged with value /u01/app/oracle

[oracle@host02 trace]$ sqlplus / as sysdba
```

Verify that the database now references datafiles under the `+DATA/DUP` ASM directory:

```sql
SQL> select file_name from dba_data_files;

FILE_NAME
--------------------------------------------------------------------------------
+DATA/DUP/DATAFILE/system.268.1215039533
+DATA/DUP/DATAFILE/sysaux.269.1215039535
+DATA/DUP/DATAFILE/undotbs1.270.1215039539
+DATA/DUP/DATAFILE/users.271.1215039541
```

## Recreate the Online Redo Logs

The datafiles now reference the new database name, but the existing online redo logs still reside under the `TEST` ASM directory.

Verify the current redo log configuration:

```sql
SQL> set pages 400 lines 200

SQL> SELECT a.GROUP#, a.THREAD#, a.SEQUENCE#,
  2         a.ARCHIVED, a.STATUS, b.MEMBER AS REDOLOG_FILE_NAME,
  3         (a.BYTES/1024/1024) AS SIZE_MB
  4  FROM v$log a
  5  JOIN v$logfile b ON a.GROUP# = b.GROUP#
  6  ORDER BY a.GROUP#;

    GROUP#    THREAD#  SEQUENCE# ARC STATUS           REDOLOG_FILE_NAME                                     SIZE_MB
---------- ---------- ---------- --- ---------------- -------------------------------------------------- ----------
         1          1          4 NO  CURRENT          +DATA/TEST/ONLINELOG/group_1.264.1214951669               200
         1          1          4 NO  CURRENT          +RECO/TEST/ONLINELOG/group_1.259.1214951671               200
         2          1          2 YES INACTIVE         +DATA/TEST/ONLINELOG/group_2.265.1214951669               200
         2          1          2 YES INACTIVE         +RECO/TEST/ONLINELOG/group_2.258.1214951671               200
         3          1          3 YES INACTIVE         +DATA/TEST/ONLINELOG/group_3.266.1214951669               200
         3          1          3 YES INACTIVE         +RECO/TEST/ONLINELOG/group_3.260.1214951671               200

6 rows selected.
```

Verify the current OMF destination parameters:

```sql
SQL> show parameter create

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
create_bitmap_area_size              integer     8388608
create_stored_outlines               string
db_create_file_dest                  string      +DATA
db_create_online_log_dest_1          string
db_create_online_log_dest_2          string
db_create_online_log_dest_3          string
db_create_online_log_dest_4          string
db_create_online_log_dest_5          string
```

Configure the ASM destinations for the online redo logs:

```sql
SQL> alter system set db_create_online_log_dest_1='+DATA' scope=both;

System altered.

SQL> alter system set db_create_online_log_dest_2='+RECO' scope=both;

System altered.
```

Verify the configuration:

```sql
SQL> show parameter create

NAME                                 TYPE        VALUE
------------------------------------ ----------- ------------------------------
create_bitmap_area_size              integer     8388608
create_stored_outlines               string
db_create_file_dest                  string      +DATA
db_create_online_log_dest_1          string      +DATA
db_create_online_log_dest_2          string      +RECO
db_create_online_log_dest_3          string
db_create_online_log_dest_4          string
db_create_online_log_dest_5          string
```

Create three new redo log groups:

```sql
SQL> alter database add logfile group 4 size 200M;

Database altered.

SQL> alter database add logfile group 5 size 200M;

Database altered.

SQL> alter database add logfile group 6 size 200M;

Database altered.
```

Verify that the new groups were created under the `DUP` ASM directory:

```sql
SQL> SELECT a.GROUP#, a.THREAD#, a.SEQUENCE#,
  2         a.ARCHIVED, a.STATUS, b.MEMBER AS REDOLOG_FILE_NAME,
  3         (a.BYTES/1024/1024) AS SIZE_MB
  4  FROM v$log a
  5  JOIN v$logfile b ON a.GROUP# = b.GROUP#
  6  ORDER BY a.GROUP#;

    GROUP#    THREAD#  SEQUENCE# ARC STATUS           REDOLOG_FILE_NAME                                     SIZE_MB
---------- ---------- ---------- --- ---------------- -------------------------------------------------- ----------
         1          1          4 NO  CURRENT          +RECO/TEST/ONLINELOG/group_1.259.1214951671               200
         1          1          4 NO  CURRENT          +DATA/TEST/ONLINELOG/group_1.264.1214951669               200
         2          1          2 YES INACTIVE         +DATA/TEST/ONLINELOG/group_2.265.1214951669               200
         2          1          2 YES INACTIVE         +RECO/TEST/ONLINELOG/group_2.258.1214951671               200
         3          1          3 YES INACTIVE         +RECO/TEST/ONLINELOG/group_3.260.1214951671               200
         3          1          3 YES INACTIVE         +DATA/TEST/ONLINELOG/group_3.266.1214951669               200
         4          1          0 YES UNUSED           +DATA/DUP/ONLINELOG/group_4.272.1215041661                200
         4          1          0 YES UNUSED           +RECO/DUP/ONLINELOG/group_4.263.1215041661                200
         5          1          0 YES UNUSED           +DATA/DUP/ONLINELOG/group_5.273.1215041667                200
         5          1          0 YES UNUSED           +RECO/DUP/ONLINELOG/group_5.273.1215041667                200
         6          1          0 YES UNUSED           +DATA/DUP/ONLINELOG/group_6.274.1215041673                200
         6          1          0 YES UNUSED           +RECO/DUP/ONLINELOG/group_6.274.1215041673                200
```

Switch the online redo log several times so that the original groups become inactive and can be removed:

```sql
SQL> alter system switch logfile;

System altered.

SQL> alter system switch logfile;

System altered.

SQL> alter system switch logfile;

System altered.

SQL> alter system switch logfile;

System altered.

SQL> alter system switch logfile;

System altered.
```

After confirming that the original redo log groups are no longer required, drop groups `1`, `2`, and `3`:

```sql
SQL> alter database drop logfile group 1;

Database altered.

SQL> alter database drop logfile group 2;

Database altered.

SQL> alter database drop logfile group 3;

Database altered.
```

Verify the final redo log configuration:

```sql
SQL> SELECT a.GROUP#, a.THREAD#, a.SEQUENCE#,
  2         a.ARCHIVED, a.STATUS, b.MEMBER AS REDOLOG_FILE_NAME,
  3         (a.BYTES/1024/1024) AS SIZE_MB
  4  FROM v$log a
  5  JOIN v$logfile b ON a.GROUP# = b.GROUP#
  6  ORDER BY a.GROUP#;

    GROUP#    THREAD#  SEQUENCE# ARC STATUS           REDOLOG_FILE_NAME                                     SIZE_MB
---------- ---------- ---------- --- ---------------- -------------------------------------------------- ----------
         4          1          9 NO  CURRENT          +DATA/DUP/ONLINELOG/group_4.272.1215041661                200
         4          1          9 NO  CURRENT          +RECO/DUP/ONLINELOG/group_4.263.1215041661                200
         5          1          6 YES INACTIVE         +DATA/DUP/ONLINELOG/group_5.273.1215041667                200
         5          1          6 YES INACTIVE         +RECO/DUP/ONLINELOG/group_5.273.1215041667                200
         6          1          7 YES INACTIVE         +DATA/DUP/ONLINELOG/group_6.274.1215041673                200
         6          1          7 YES INACTIVE         +RECO/DUP/ONLINELOG/group_6.274.1215041673                200

6 rows selected.
```

All online redo log members now reside under the `DUP` ASM directory.

## Update the Oracle Net Configuration

Update any static listener entries and Oracle Net aliases that still reference the original database name.

Search `tnsnames.ora` and `listener.ora` for references to `TEST`:

```bash
[oracle@host02 ~]$ grep TEST \
    /u01/app/oracle/product/19/dbhome_1/network/admin/tnsnames.ora \
    /u01/app/19/grid_1/network/admin/listener.ora

/u01/app/oracle/product/19/dbhome_1/network/admin/tnsnames.ora:TEST_duplicate =
/u01/app/oracle/product/19/dbhome_1/network/admin/tnsnames.ora:    (SERVICE_NAME = TEST_clone)
/u01/app/19/grid_1/network/admin/listener.ora:    (GLOBAL_DBNAME = TEST_clone) # service name
/u01/app/19/grid_1/network/admin/listener.ora:    (SID_NAME = TEST) # instance name
```

Replace the old database name with the new name. The `-i.bak` option also creates backup copies of the original files:

```bash
[oracle@host02 ~]$ sed -i.bak 's/TEST/DUP/g' \
    /u01/app/oracle/product/19/dbhome_1/network/admin/tnsnames.ora \
    /u01/app/19/grid_1/network/admin/listener.ora
```

Verify the updated entries:

```bash
[oracle@host02 ~]$ grep DUP \
    /u01/app/oracle/product/19/dbhome_1/network/admin/tnsnames.ora \
    /u01/app/19/grid_1/network/admin/listener.ora

/u01/app/oracle/product/19/dbhome_1/network/admin/tnsnames.ora:DUP_duplicate =
/u01/app/oracle/product/19/dbhome_1/network/admin/tnsnames.ora:    (SERVICE_NAME = DUP_clone)
/u01/app/19/grid_1/network/admin/listener.ora:    (GLOBAL_DBNAME = DUP_clone) # service name
/u01/app/19/grid_1/network/admin/listener.ora:    (SID_NAME = DUP) # instance name
```

## Create a Full Database Backup

After completing the database rename and the required Clusterware, ASM, redo log, and Oracle Net configuration changes, create a **full database backup**.

This provides a new recovery point that reflects the renamed database and its updated configuration.