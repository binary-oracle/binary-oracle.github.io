---
title: "In-Place Patching of Oracle RAC 19c Using OPatchAuto"
description: "Perform an in-place rolling patch update of a two-node Oracle RAC 19c environment using OPatchAuto, including Grid Infrastructure, Database, OJVM, Datapatch, and post-patch validation."
pubDate: 2026-01-27
tags:
  - Oracle Database
  - Oracle RAC
  - Oracle 19c
  - Grid Infrastructure
  - OPatch
  - OPatchAuto
  - OJVM
  - Patching
---

Keeping an Oracle RAC environment up to date is important for stability, security, and supportability. This guide demonstrates how to perform an **in-place patch update on a two-node Oracle RAC 19c environment**.

The procedure begins by identifying the currently installed **Oracle Database** and **Grid Infrastructure** patch levels on both nodes. The required **19.28 Release Update** is then prepared and applied to each RAC node.

The patching is performed one node at a time to maintain cluster availability and ensure that the environment remains healthy throughout the update.

## Required Patches

Before starting the patching activity, download the required patches from Oracle Support.

The following patches are used in this environment:

- **Patch 37952382** — Combo of OJVM Component 19.28.0.0.250715 and GI RU 19.28.0.0.250715
- **Patch 6880880** — OPatch Utility

Patch **37952382** is a combo patch containing the Oracle JavaVM (OJVM) and Grid Infrastructure Release Update components. The Grid Infrastructure Release Update also contains the applicable Oracle Database patch components.

Patch **6880880** provides the OPatch utility. The patch number remains the same while Oracle periodically updates the OPatch version distributed within the patch.

## Identify the Current Patch Level

Before applying the new patches, verify the current patch inventory and OPatch version for both the **Database Home** and **Grid Infrastructure Home**.

> `oram` is a custom utility used in this environment to configure the Oracle environment. If this utility is not available in your environment, set the appropriate `ORACLE_HOME`, `ORACLE_SID`, and `PATH` variables before running the commands.

### Node 1

Verify the Database Home:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ opatch lspatches; opatch version
37499406;OJVM RELEASE UPDATE: 19.27.0.0.250415 (37499406)
37654975;OCW RELEASE UPDATE 19.27.0.0.0 (37654975)
37642901;Database Release Update : 19.27.0.0.250415 (37642901)

OPatch succeeded.
OPatch Version: 12.2.0.1.45

OPatch succeeded.
```

Verify the Grid Infrastructure Home:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ oram +ASM1; opatch version; opatch lspatches
 Aliases set for instance '+ASM1'
 - talert: tail -50f /u01/app/oracle/diag/asm/+asm/+ASM1/trace/alert_+ASM1.log
 - valert: less /u01/app/oracle/diag/asm/+asm/+ASM1/trace/alert_+ASM1.log
 - cdbd: cd /u01/app/oracle/diag/asm/+asm/+ASM1/trace
OPatch Version: 12.2.0.1.45

OPatch succeeded.
37762426;TOMCAT RELEASE UPDATE 19.0.0.0.0 (37762426)
37654975;OCW RELEASE UPDATE 19.27.0.0.0 (37654975)
37643161;ACFS RELEASE UPDATE 19.27.0.0.0 (37643161)
37642901;Database Release Update : 19.27.0.0.250415 (37642901)
36758186;DBWLM RELEASE UPDATE 19.0.0.0.0 (36758186)

OPatch succeeded.
```

### Node 2

Verify the Database Home:

```bash
oracle@ol8-19-rac1 cdbrac2 > ~ $ opatch lspatches; opatch version
37499406;OJVM RELEASE UPDATE: 19.27.0.0.250415 (37499406)
37654975;OCW RELEASE UPDATE 19.27.0.0.0 (37654975)
37642901;Database Release Update : 19.27.0.0.250415 (37642901)

OPatch succeeded.

OPatch Version: 12.2.0.1.45

OPatch succeeded.
```

Verify the Grid Infrastructure Home:

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ oram +ASM2; opatch version; opatch lspatches
 Aliases set for instance '+ASM2'
 - talert: tail -50f /u01/app/oracle/diag/asm/+asm/+ASM2/trace/alert_+ASM1.log
 - valert: less /u01/app/oracle/diag/asm/+asm/+ASM2/trace/alert_+ASM1.log
 - cdbd: cd /u01/app/oracle/diag/asm/+asm/+ASM2/trace
OPatch Version: 12.2.0.1.45

OPatch succeeded.
37762426;TOMCAT RELEASE UPDATE 19.0.0.0.0 (37762426)
37654975;OCW RELEASE UPDATE 19.27.0.0.0 (37654975)
37643161;ACFS RELEASE UPDATE 19.27.0.0.0 (37643161)
37642901;Database Release Update : 19.27.0.0.250415 (37642901)
36758186;DBWLM RELEASE UPDATE 19.0.0.0.0 (36758186)

OPatch succeeded
```

The output confirms that both nodes are currently running the **19.27 Release Update**, with **OPatch 12.2.0.1.45**. 

## Update OPatch

Before applying the Release Update, update the OPatch utility in both the **Grid Infrastructure Home** and the **Database Home**.

Using the required OPatch version helps ensure compatibility with the patch bundle and prevents prerequisite or patch application failures.

### Verify the Patch Files

The patch files are staged under `/u01/stage` on both nodes.

#### Node 1

```bash
[root@ol8-19-rac1 stage]# pwd
/u01/stage

[root@ol8-19-rac1 stage]# ls -ltra
total 4085428
drwxr-xr-x. 5 root   oinstall         46 Jan 27 00:42 ..
-rw-r--r--. 1 oracle oinstall   72896144 Jan 27 00:44 p6880880_190000_Linux-x86-64.zip
drwxr-xr-x. 2 oracle oinstall         87 Jan 27 00:44 .
-rw-r--r--. 1 oracle oinstall 4110578680 Jan 27 00:45 p37952382_190000_Linux-x86-64.zip
```

#### Node 2

```bash
[root@ol8-19-rac2 stage]# pwd
/u01/stage

[root@ol8-19-rac2 stage]# ls -ltra
total 4085428
drwxr-xr-x. 5 root   oinstall         46 Jan 27 00:42 ..
-rw-r--r--. 1 oracle oinstall   72896144 Jan 27 00:44 p6880880_190000_Linux-x86-64.zip
drwxr-xr-x. 2 oracle oinstall         87 Jan 27 00:44 .
-rw-r--r--. 1 oracle oinstall 4110578680 Jan 27 00:45 p37952382_190000_Linux-x86-64.zip
```

## Update OPatch in the Grid Infrastructure Home

Update the OPatch utility in the Grid Infrastructure Home on both nodes.

### Node 1

Back up the existing OPatch directory and extract the new version:

```bash
[root@ol8-19-rac1 ~]# cd /u01/stage/
[root@ol8-19-rac1 stage]# mv /u01/app/19.0.0/grid/OPatch/ /u01/app/19.0.0/grid/OPatch_$(date +"%d-%m-%Y")
[root@ol8-19-rac1 stage]# unzip -oq p6880880_190000_Linux-x86-64.zip -d /u01/app/19.0.0/grid/
[root@ol8-19-rac1 stage]# chown -R oracle:oinstall /u01/app/19.0.0/grid/OPatch/
```

Verify the OPatch directories:

```bash
[root@ol8-19-rac1 stage]# ls -ltra /u01/app/19.0.0/grid | grep OP*
drwxr-xr-x.  2 oracle oinstall    26 Apr 17  2019 QOpatch
drwxr-x---. 15 oracle oinstall  4096 Jan  6 10:30 OPatch
drwxr-x---. 15 oracle oinstall  4096 Jan 25 15:44 OPatch_27-01-2026
```

### Node 2

Repeat the same procedure on the second node:

```bash
[root@ol8-19-rac2 ~]# cd /u01/stage/
[root@ol8-19-rac2 stage]# mv /u01/app/19.0.0/grid/OPatch/ /u01/app/19.0.0/grid/OPatch_$(date +"%d-%m-%Y")
[root@ol8-19-rac2 stage]# unzip -oq p6880880_190000_Linux-x86-64.zip -d /u01/app/19.0.0/grid/
[root@ol8-19-rac2 stage]# chown -R oracle:oinstall /u01/app/19.0.0/grid/OPatch/
```

Verify the result:

```bash
[root@ol8-19-rac2 stage]# ls -ltra /u01/app/19.0.0/grid | grep OP*
drwxr-x---. 15 oracle oinstall  4096 Jan  6 10:30 OPatch
drwxr-xr-x.  2 oracle oinstall    26 Jan 25 15:45 QOpatch
drwxr-x---. 15 oracle oinstall  4096 Jan 25 15:46 OPatch_27-01-2026
```

## Update OPatch in the Database Home

Update the OPatch utility in the Oracle Database Home on both nodes.

### Node 1

```bash
[root@ol8-19-rac1 ~]# cd /u01/stage/
[root@ol8-19-rac1 stage]# mv /u01/app/oracle/product/19.0.0/dbhome_1/OPatch/ /u01/app/oracle/product/19.0.0/dbhome_1/OPatch_$(date +"%d-%m-%Y")
[root@ol8-19-rac1 stage]# unzip -oq p6880880_190000_Linux-x86-64.zip -d /u01/app/oracle/product/19.0.0/dbhome_1/
[root@ol8-19-rac1 stage]# chown -R oracle:oinstall /u01/app/oracle/product/19.0.0/dbhome_1/OPatch
```

Verify the directories:

```bash
[root@ol8-19-rac1 stage]# ls -ltra /u01/app/oracle/product/19.0.0/dbhome_1/ | grep OP*
-rw-r--r--.  1 oracle oinstall  2927 Oct 14  2016 schagent.conf
drwxr-xr-x.  2 oracle oinstall    26 Apr 17  2019 QOpatch
drwxr-x---. 15 oracle oinstall  4096 Jan  6 10:30 OPatch
drwxr-x---. 15 oracle oinstall  4096 Jan 25 16:27 OPatch_27-01-2026
```

### Node 2

```bash
[root@ol8-19-rac2 ~]# cd /u01/stage/
[root@ol8-19-rac2 stage]# mv /u01/app/oracle/product/19.0.0/dbhome_1/OPatch/ /u01/app/oracle/product/19.0.0/dbhome_1/OPatch_$(date +"%d-%m-%Y")
[root@ol8-19-rac2 stage]# unzip -oq p6880880_190000_Linux-x86-64.zip -d /u01/app/oracle/product/19.0.0/dbhome_1/
[root@ol8-19-rac2 stage]# chown -R oracle:oinstall /u01/app/oracle/product/19.0.0/dbhome_1/OPatch
```

Verify the directories:

```bash
[root@ol8-19-rac2 stage]# ls -ltra /u01/app/oracle/product/19.0.0/dbhome_1/ | grep OP*
drwxr-x---. 15 oracle oinstall  4096 Jan  6 10:30 OPatch
drwxr-xr-x.  2 oracle oinstall    26 Jan 25 16:29 QOpatch
drwxr-x---. 15 oracle oinstall  4096 Jan 25 16:29 OPatch_27-01-2026
```

## Verify the Updated OPatch Version

Verify the OPatch version in both the Database Home and Grid Infrastructure Home.

### Node 1

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ oram cdbrac; opatch version; oram +ASM1; opatch version
```

```text
The Oracle base remains unchanged with value /u01/app/oracle
 Setting the environment for resource 'CDBRAC'
 ORACLE_SID          cdbrac1
 ORACLE_HOME         /u01/app/oracle/product/19.0.0/dbhome_1
 ORACLE_BASE         /u01/app/oracle
 ROLE/MODE (CRS)     PRIMARY/open
 DB_TYPE             RAC
 Aliases set for instance 'cdbrac1'
 - talert: tail -50f /u01/app/oracle/diag/rdbms/cdbrac/cdbrac1/trace/alert_cdbrac1.log
 - valert: less /u01/app/oracle/diag/rdbms/cdbrac/cdbrac1/trace/alert_cdbrac1.log
 - cdbd: cd /u01/app/oracle/diag/rdbms/cdbrac/cdbrac1/trace
OPatch Version: 12.2.0.1.49

OPatch succeeded.

 Aliases set for instance '+ASM1'
 - talert: tail -50f /u01/app/oracle/diag/asm/+asm/+ASM1/trace/alert_+ASM1.log
 - valert: less /u01/app/oracle/diag/asm/+asm/+ASM1/trace/alert_+ASM1.log
 - cdbd: cd /u01/app/oracle/diag/asm/+asm/+ASM1/trace
OPatch Version: 12.2.0.1.49

OPatch succeeded.
```

### Node 2

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ oram cdbrac; opatch version; oram +ASM1; opatch version
```

Example output:

```text
The Oracle base remains unchanged with value /u01/app/oracle
 Setting the environment for resource 'CDBRAC'
 ORACLE_SID          cdbrac2
 ORACLE_HOME         /u01/app/oracle/product/19.0.0/dbhome_1
 ORACLE_BASE         /u01/app/oracle
 ROLE/MODE (CRS)     PRIMARY/open
 DB_TYPE             RAC
 Aliases set for instance 'cdbrac2'
 - talert: tail -50f /u01/app/oracle/diag/rdbms/cdbrac/cdbrac2/trace/alert_cdbrac2.log
 - valert: less /u01/app/oracle/diag/rdbms/cdbrac/cdbrac2/trace/alert_cdbrac2.log
 - cdbd: cd /u01/app/oracle/diag/rdbms/cdbrac/cdbrac2/trace
OPatch Version: 12.2.0.1.49

OPatch succeeded.

 Aliases set for instance '+ASM2'
 - talert: tail -50f /u01/app/oracle/diag/asm/+asm/+ASM2/trace/alert_+ASM2.log
 - valert: less /u01/app/oracle/diag/asm/+asm/+ASM2/trace/alert_+ASM2.log
 - cdbd: cd /u01/app/oracle/diag/asm/+asm/+ASM2/trace
OPatch Version: 12.2.0.1.49

OPatch succeeded.
```

Verify that both Oracle Homes on both nodes now report:

```text
OPatch Version: 12.2.0.1.49
```

## Review the Combo Patch Structure

After extracting the combo patch, review its directory structure to identify the **OJVM** and **Grid Infrastructure** patch directories.

In this patch bundle, the primary directories are:

- `37847857` — OJVM Release Update
- `37957391` — Grid Infrastructure Release Update bundle

The Grid Infrastructure bundle contains several sub-patches, including the applicable Database Release Update.

Review the patch structure:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ tree -L 3 -P "readme.html" /u01/stage/
/u01/stage/
└── 37952382
    ├── 37847857
    │   ├── etc
    │   └── files
    └── 37957391
        ├── 36758186
        ├── 37960098
        ├── 37962938
        ├── 37962946
        ├── 38124772
        └── automation

11 directories, 0 files
```

Locate the README files:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ tree -P "README.html" --prune /u01/stage
/u01/stage
└── 37952382
    ├── 37847857
    │   └── README.html
    ├── 37957391
    │   ├── 37960098
    │   │   ├── files
    │   │   │   └── jdk
    │   │   │       └── README.html
    │   │   └── README.html
    │   └── README.html
    └── README.html

6 directories, 5 files
```

Review the applicable `README.html` files before applying the patches.

## Run the CVU Pre-Patch Validation

Run Cluster Verification Utility (`cluvfy`) before applying the patch.

This validation checks the cluster configuration and identifies issues that could affect the patching operation.

Run:

```bash
oracle@ol8-19-rac1 +ASM1 > ~ $ /u01/app/19.0.0/grid/bin/cluvfy stage -pre patch
```

Example output:

```text
Performing following verification checks ...

  cluster upgrade state ...PASSED
  OLR Integrity ...PASSED
  Hosts File ...PASSED
  Path existence, ownership, permissions and attributes ...
    Path "/u01/app/19.0.0/grid/gpnp/wallets/peer/cwallet.sso" ...PASSED
    Path "/u01/app/19.0.0/grid/gpnp/wallets/root/ewallet.p12" ...PASSED
    Path "/u01/app/19.0.0/grid/gpnp/profiles/peer/profile.xml" ...PASSED
  Path existence, ownership, permissions and attributes ...PASSED
  Free Space: ol8-19-rac2:/ ...PASSED
  Free Space: ol8-19-rac1:/ ...PASSED
  OPatch utility version consistency ...PASSED
  ASM Integrity ...
    Node Connectivity ...
      Hosts File ...PASSED
      Check that maximum (MTU) size packet goes through subnet ...PASSED
      subnet mask consistency for subnet "192.168.1.0" ...PASSED
      subnet mask consistency for subnet "192.168.56.0" ...PASSED
    Node Connectivity ...PASSED
  ASM Integrity ...PASSED
  Software home: /u01/app/19.0.0/grid ...PASSED
  ORAchk checks ...
    Software maintenance best practices ...PASSED
    Hostname formatting ...PASSED
    GI/CRS - Private interconnect interface name check ...PASSED
    VIP NIC bonding config. ...PASSED
    Clusterware resource status ...PASSED
    Oracle database software owner soft stack shell limits ...PASSED
    oradism executable permission ...PASSED
    Interconnect NIC bonding config. ...PASSED
    oradism executable ownership ...PASSED
    Verify operating system hugepages count satisfies total SGA requirements ...PASSED
    Non-routable network for interconnect ...PASSED
    Clusterware software version comparison ...PASSED
    ORA_CRS_HOME env variable for Grid infrastructure owner ...PASSED
    Disks without Disk Group ...PASSED
    NTP with correct setting ...PASSED
  ORAchk checks ...PASSED

Pre-check for Patch Application was successful.
```

The successful precheck confirms that the cluster is ready for the patching operation.

## Run the OPatchAuto Analyze Check

After extracting the combo patch, run the OPatchAuto prerequisite analysis against the Grid Infrastructure Release Update directory.

> **Important:** Run OPatchAuto as the `root` user.

Extract the patch:

```bash
oracle@ol8-19-rac1 +ASM1 > ~ $ unzip -q /u01/stage/p37952382_190000_Linux-x86-64.zip -d /u01/stage
```

### Node 1

Set the Grid Infrastructure environment:

```bash
[root@ol8-19-rac1 ~]# cd /tmp/
[root@ol8-19-rac1 tmp]# . oraenv <<< +ASM1
ORACLE_SID = [root] ? The Oracle base has been set to /u01/app/oracle
```

Run the analysis:

```bash
[root@ol8-19-rac1 tmp]# $ORACLE_HOME/OPatch/opatchauto apply /u01/stage/37952382/37957391 -analyze
```

Verify that the analysis completes successfully:

```text
Executing OPatch prereq operations to verify patch applicability on home /u01/app/19.0.0/grid
Patch applicability verified successfully on home /u01/app/19.0.0/grid

Executing OPatch prereq operations to verify patch applicability on home /u01/app/oracle/product/19.0.0/dbhome_1
Patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Executing patch validation checks on home /u01/app/19.0.0/grid
Patch validation checks successfully completed on home /u01/app/19.0.0/grid

Executing patch validation checks on home /u01/app/oracle/product/19.0.0/dbhome_1
Patch validation checks successfully completed on home /u01/app/oracle/product/19.0.0/dbhome_1

Verifying SQL patch applicability on home /u01/app/oracle/product/19.0.0/dbhome_1
SQL patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

OPatchAuto successful.
```

### Node 2

Set the Grid Infrastructure environment:

```bash
[root@ol8-19-rac2 ~]# cd /tmp/
[root@ol8-19-rac2 tmp]# . oraenv <<< +ASM2
ORACLE_SID = [root] ? The Oracle base has been set to /u01/app/oracle
```

Run the analysis:

```bash
[root@ol8-19-rac2 tmp]# $ORACLE_HOME/OPatch/opatchauto apply /u01/stage/37952382/37957391 -analyze
```

Verify that OPatchAuto reports:

```text
Patch applicability verified successfully on home /u01/app/19.0.0/grid
Patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1
Patch validation checks successfully completed on home /u01/app/19.0.0/grid
Patch validation checks successfully completed on home /u01/app/oracle/product/19.0.0/dbhome_1
SQL patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

OPatchAuto successful.
```

The prerequisite analysis has now completed successfully on both RAC nodes.

## Apply the Grid Infrastructure and Database Patches

Apply the Grid Infrastructure and Database Release Update using **OPatchAuto**.

The patching is performed in a rolling manner. Patch one RAC node at a time, verify that the node and cluster resources are healthy, and then continue with the next node.

OPatchAuto applies the applicable binary patches to the **Grid Infrastructure Home** and **Database Home**.

The **OJVM patch** is applied separately to the Database Home on each node.

## Patch Node 1

Set the Grid Infrastructure environment and run OPatchAuto as the `root` user:

```bash
[root@ol8-19-rac1 tmp]# . oraenv <<< +ASM1
[root@ol8-19-rac1 tmp]# $ORACLE_HOME/OPatch/opatchauto apply /u01/stage/37952382/37957391
```

Example output:

```text
OPatchauto session is initiated at Thu Feb 12 00:41:16 2026

Executing OPatch prereq operations to verify patch applicability on home /u01/app/19.0.0/grid
Patch applicability verified successfully on home /u01/app/19.0.0/grid

Executing OPatch prereq operations to verify patch applicability on home /u01/app/oracle/product/19.0.0/dbhome_1
Patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Executing patch validation checks on home /u01/app/19.0.0/grid
Patch validation checks successfully completed on home /u01/app/19.0.0/grid

Executing patch validation checks on home /u01/app/oracle/product/19.0.0/dbhome_1
Patch validation checks successfully completed on home /u01/app/oracle/product/19.0.0/dbhome_1

Verifying SQL patch applicability on home /u01/app/oracle/product/19.0.0/dbhome_1
SQL patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Preparing to bring down database service on home /u01/app/oracle/product/19.0.0/dbhome_1
Successfully prepared home /u01/app/oracle/product/19.0.0/dbhome_1 to bring down database service

Performing prepatch operations on CRS - bringing down CRS service on home /u01/app/19.0.0/grid
CRS service brought down successfully on home /u01/app/19.0.0/grid

Performing prepatch operation on home /u01/app/oracle/product/19.0.0/dbhome_1
Prepatch operation completed successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Start applying binary patch on home /u01/app/oracle/product/19.0.0/dbhome_1
Binary patch applied successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Running rootadd_rdbms.sh on home /u01/app/oracle/product/19.0.0/dbhome_1
Successfully executed rootadd_rdbms.sh on home /u01/app/oracle/product/19.0.0/dbhome_1

Performing postpatch operation on home /u01/app/oracle/product/19.0.0/dbhome_1
Postpatch operation completed successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Start applying binary patch on home /u01/app/19.0.0/grid
Binary patch applied successfully on home /u01/app/19.0.0/grid

Running rootadd_rdbms.sh on home /u01/app/19.0.0/grid
Successfully executed rootadd_rdbms.sh on home /u01/app/19.0.0/grid

Performing postpatch operations on CRS - starting CRS service on home /u01/app/19.0.0/grid
CRS service started successfully on home /u01/app/19.0.0/grid

OPatchAuto successful.
```

Verify that the applicable Database Home patches were applied:

```text
==Following patches were SUCCESSFULLY applied:

Patch: /u01/stage/37952382/37957391/37960098
Patch: /u01/stage/37952382/37957391/37962946
```

Verify the Grid Infrastructure Home:

```text
==Following patches were SUCCESSFULLY applied:

Patch: /u01/stage/37952382/37957391/37960098
Patch: /u01/stage/37952382/37957391/37962938
Patch: /u01/stage/37952382/37957391/37962946
Patch: /u01/stage/37952382/37957391/38124772
```

The session completes successfully:

```text
OPatchauto session completed at Thu Feb 12 00:59:21 2026
Time taken to complete the session 18 minutes, 2 seconds
```

## Apply the OJVM Patch on Node 1

The OJVM binary patch must also be applied to the Database Home on Node 1.

Set the Database Home environment:

```bash
[oracle@ol8-19-rac1 ~]$ oram cdbrac
The Oracle base remains unchanged with value /u01/app/oracle
 Setting the environment for resource 'CDBRAC'
 ORACLE_SID          cdbrac1
 ORACLE_HOME         /u01/app/oracle/product/19.0.0/dbhome_1
 ORACLE_BASE         /u01/app/oracle
 ROLE/MODE (CRS)     PRIMARY/open
 DB_TYPE             RAC
```

Verify `ORACLE_HOME`:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ echo $ORACLE_HOME
/u01/app/oracle/product/19.0.0/dbhome_1
```

Change to the OJVM patch directory:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ cd /u01/stage/37952382/37847857
```

Verify the current RAC database status:

```bash
oracle@ol8-19-rac1 cdbrac1 > 37847857 $ srvctl status database -db cdbrac
Instance cdbrac1 is running on node ol8-19-rac1
Instance cdbrac2 is running on node ol8-19-rac2
```

Stop only the database instance running on **Node 1**:

```bash
oracle@ol8-19-rac1 cdbrac1 > 37847857 $ srvctl stop instance -db cdbrac -instance cdbrac1
```

Verify that the Node 1 instance is stopped while the Node 2 instance remains available:

```bash
oracle@ol8-19-rac1 cdbrac1 > 37847857 $ srvctl status database -db cdbrac
Instance cdbrac1 is not running on node ol8-19-rac1
Instance cdbrac2 is running on node ol8-19-rac2
```

Apply the OJVM patch:

```bash
oracle@ol8-19-rac1 cdbrac1 > 37847857 $ $ORACLE_HOME/OPatch/opatch apply -silent
```

Example output:

```text
Oracle Interim Patch Installer version 12.2.0.1.49
Copyright (c) 2026, Oracle Corporation.  All rights reserved.

Oracle Home       : /u01/app/oracle/product/19.0.0/dbhome_1
Central Inventory : /u01/app/oraInventory
   from           : /u01/app/oracle/product/19.0.0/dbhome_1/oraInst.loc
OPatch version    : 12.2.0.1.49
OUI version       : 12.2.0.7.0

Verifying environment and performing prerequisite checks...
OPatch continues with these patches:   37847857

Do you want to proceed? [y|n]
Y (auto-answered by -silent)
User Responded with: Y
All checks passed.

Please shutdown Oracle instances running out of this ORACLE_HOME on the local system.
(Oracle Home = '/u01/app/oracle/product/19.0.0/dbhome_1')

Is the local system ready for patching? [y|n]
Y (auto-answered by -silent)
User Responded with: Y

Backing up files...
Applying interim patch '37847857' to OH '/u01/app/oracle/product/19.0.0/dbhome_1'

Patching component oracle.javavm.server, 19.0.0.0.0...
Patching component oracle.javavm.server.core, 19.0.0.0.0...
Patching component oracle.rdbms.dbscripts, 19.0.0.0.0...
Patching component oracle.rdbms, 19.0.0.0.0...
Patching component oracle.javavm.client, 19.0.0.0.0...

Patch 37847857 successfully applied.
Sub-set patch [37499406] has become inactive due to the application of a super-set patch [37847857].

OPatch succeeded.
```

Start the database instance on **Node 1**:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ srvctl start instance -db cdbrac -instance cdbrac1
```

Verify that both RAC instances are running:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ srvctl status database -db cdbrac
Instance cdbrac1 is running on node ol8-19-rac1
Instance cdbrac2 is running on node ol8-19-rac2
```

## Verify Node 1 Binary Patches

Verify the Database Home patch inventory on Node 1:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ opatch lspatches
37847857;OJVM RELEASE UPDATE: 19.28.0.0.250715 (37847857)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)

OPatch succeeded.
```

Set the Grid Infrastructure environment and verify its patch inventory:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ oram +ASM1
```

```text
38124772;TOMCAT RELEASE UPDATE 19.0.0.0.0 (38124772)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37962938;ACFS RELEASE UPDATE 19.28.0.0.0 (37962938)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)
36758186;DBWLM RELEASE UPDATE 19.0.0.0.0 (36758186)

OPatch succeeded.
```

## Verify the Rolling Patch State

Check the current Clusterware patch state:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ . oraenv <<< +ASM1
oracle@ol8-19-rac1 +ASM1 > ~ $ crsctl query crs activeversion -f
Oracle Clusterware active version on the cluster is [19.0.0.0.0]. The cluster upgrade state is [ROLLING PATCH]. The cluster active patch level is [2119256259].
```

The `ROLLING PATCH` state is expected because Node 1 has been patched while Node 2 has not yet completed the patching cycle.

## Patch Node 2

After successfully patching and validating Node 1, continue with Node 2.

Set the Grid Infrastructure environment as the `root` user:

```bash
[root@ol8-19-rac2 ~]# cd /tmp/
[root@ol8-19-rac2 tmp]# . oraenv <<< +ASM2
```

Apply the Grid Infrastructure and Database patches:

```bash
[root@ol8-19-rac2 tmp]# $ORACLE_HOME/OPatch/opatchauto apply /u01/stage/37952382/37957391
```

Example output:

```text
OPatchauto session is initiated at Thu Feb 12 02:05:56 2026

System initialization log file is /u01/app/19.0.0/grid/cfgtoollogs/opatchautodb/systemconfig2026-02-12_02-06-00AM.log.

Session log file is /u01/app/19.0.0/grid/cfgtoollogs/opatchauto/opatchauto2026-02-12_02-06-17AM.log

Executing OPatch prereq operations to verify patch applicability on home /u01/app/19.0.0/grid
Patch applicability verified successfully on home /u01/app/19.0.0/grid

Executing OPatch prereq operations to verify patch applicability on home /u01/app/oracle/product/19.0.0/dbhome_1
Patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Executing patch validation checks on home /u01/app/19.0.0/grid
Patch validation checks successfully completed on home /u01/app/19.0.0/grid

Executing patch validation checks on home /u01/app/oracle/product/19.0.0/dbhome_1
Patch validation checks successfully completed on home /u01/app/oracle/product/19.0.0/dbhome_1

Verifying SQL patch applicability on home /u01/app/oracle/product/19.0.0/dbhome_1
SQL patch applicability verified successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Preparing to bring down database service on home /u01/app/oracle/product/19.0.0/dbhome_1
Successfully prepared home /u01/app/oracle/product/19.0.0/dbhome_1 to bring down database service

Performing prepatch operations on CRS - bringing down CRS service on home /u01/app/19.0.0/grid
CRS service brought down successfully on home /u01/app/19.0.0/grid

Performing prepatch operation on home /u01/app/oracle/product/19.0.0/dbhome_1
Prepatch operation completed successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Start applying binary patch on home /u01/app/oracle/product/19.0.0/dbhome_1
Binary patch applied successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Running rootadd_rdbms.sh on home /u01/app/oracle/product/19.0.0/dbhome_1
Successfully executed rootadd_rdbms.sh on home /u01/app/oracle/product/19.0.0/dbhome_1

Performing postpatch operation on home /u01/app/oracle/product/19.0.0/dbhome_1
Postpatch operation completed successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

Start applying binary patch on home /u01/app/19.0.0/grid
Binary patch applied successfully on home /u01/app/19.0.0/grid

Running rootadd_rdbms.sh on home /u01/app/19.0.0/grid
Successfully executed rootadd_rdbms.sh on home /u01/app/19.0.0/grid

Performing postpatch operations on CRS - starting CRS service on home /u01/app/19.0.0/grid
CRS service started successfully on home /u01/app/19.0.0/grid

Preparing home /u01/app/oracle/product/19.0.0/dbhome_1 after database service restarted
No step execution required.........

Trying to apply SQL patch on home /u01/app/oracle/product/19.0.0/dbhome_1

SQL patch applied successfully on home /u01/app/oracle/product/19.0.0/dbhome_1

OPatchAuto successful.
```

Verify the successful Database Home patch summary:

```text
==Following patches were SUCCESSFULLY applied:

Patch: /u01/stage/37952382/37957391/37960098
Patch: /u01/stage/37952382/37957391/37962946
```

Verify the Grid Infrastructure Home patch summary:

```text
==Following patches were SUCCESSFULLY applied:

Patch: /u01/stage/37952382/37957391/37960098
Patch: /u01/stage/37952382/37957391/37962938
Patch: /u01/stage/37952382/37957391/37962946
Patch: /u01/stage/37952382/37957391/38124772
```

The OPatchAuto session completes successfully:

```text
OPatchauto session completed at Thu Feb 12 02:55:25 2026
Time taken to complete the session 49 minutes, 25 seconds
```

## Apply the OJVM Patch on Node 2

Set the Database Home environment and verify `ORACLE_HOME`:

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ echo $ORACLE_HOME
/u01/app/oracle/product/19.0.0/dbhome_1
```

Change to the OJVM patch directory:

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ cd /u01/stage/37952382/37847857
```

Verify that both RAC instances are currently running:

```bash
oracle@ol8-19-rac2 cdbrac2 > 37847857 $ srvctl status database -db cdbrac
Instance cdbrac1 is running on node ol8-19-rac1
Instance cdbrac2 is running on node ol8-19-rac2
```

Stop only the database instance running on **Node 2**:

```bash
oracle@ol8-19-rac2 cdbrac2 > 37847857 $ srvctl stop instance -db cdbrac -instance cdbrac2
```

Verify that the Node 2 instance is stopped while Node 1 remains available:

```bash
oracle@ol8-19-rac2 cdbrac2 > 37847857 $ srvctl status database -db cdbrac
Instance cdbrac1 is running on node ol8-19-rac1
Instance cdbrac2 is not running on node ol8-19-rac2
```

Apply the OJVM patch:

```bash
oracle@ol8-19-rac2 cdbrac2 > 37847857 $ $ORACLE_HOME/OPatch/opatch apply -silent
```

Example output:

```text
Oracle Interim Patch Installer version 12.2.0.1.49
Copyright (c) 2026, Oracle Corporation.  All rights reserved.

Oracle Home       : /u01/app/oracle/product/19.0.0/dbhome_1
Central Inventory : /u01/app/oraInventory
   from           : /u01/app/oracle/product/19.0.0/dbhome_1/oraInst.loc
OPatch version    : 12.2.0.1.49
OUI version       : 12.2.0.7.0

Verifying environment and performing prerequisite checks...
OPatch continues with these patches:   37847857

Do you want to proceed? [y|n]
Y (auto-answered by -silent)
User Responded with: Y
All checks passed.

Please shutdown Oracle instances running out of this ORACLE_HOME on the local system.
(Oracle Home = '/u01/app/oracle/product/19.0.0/dbhome_1')

Is the local system ready for patching? [y|n]
Y (auto-answered by -silent)
User Responded with: Y

Backing up files...
Applying interim patch '37847857' to OH '/u01/app/oracle/product/19.0.0/dbhome_1'

Patching component oracle.javavm.server, 19.0.0.0.0...
Patching component oracle.javavm.server.core, 19.0.0.0.0...
Patching component oracle.rdbms.dbscripts, 19.0.0.0.0...
Patching component oracle.rdbms, 19.0.0.0.0...
Patching component oracle.javavm.client, 19.0.0.0.0...

Patch 37847857 successfully applied.
Sub-set patch [37499406] has become inactive due to the application of a super-set patch [37847857].

OPatch succeeded.
```

Start the database instance on **Node 2**:

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ srvctl start instance -db cdbrac -instance cdbrac2
```

Verify that both RAC instances are running:

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ srvctl status database -db cdbrac
Instance cdbrac1 is running on node ol8-19-rac1
Instance cdbrac2 is running on node ol8-19-rac2
```

## Verify Node 2 Binary Patches

Verify the Database Home patch inventory:

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ opatch lspatches
37847857;OJVM RELEASE UPDATE: 19.28.0.0.250715 (37847857)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)

OPatch succeeded.
```

Verify the Grid Infrastructure Home patch inventory:

```text
38124772;TOMCAT RELEASE UPDATE 19.0.0.0.0 (38124772)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37962938;ACFS RELEASE UPDATE 19.28.0.0.0 (37962938)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)
36758186;DBWLM RELEASE UPDATE 19.0.0.0.0 (36758186)

OPatch succeeded.
```

## Run Datapatch

After completing the binary patching on **both RAC nodes**, verify that both database instances are running.

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ srvctl status database -db cdbrac
Instance cdbrac1 is running on node ol8-19-rac1
Instance cdbrac2 is running on node ol8-19-rac2
```

For an Oracle RAC database, Datapatch is executed against the database and does not need to be run separately from every RAC node.

Run the Datapatch validation and SQL patching once from one node after the required binary patches, including OJVM, have been installed across the RAC environment.

### Run the Datapatch Sanity Checks

Run:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ $ORACLE_HOME/OPatch/datapatch -sanity_checks
```

Example output:

```text
SQL Patching sanity checks version 19.28.0.0.0 on Thu 12 Feb 2026 01:25:22 AM UTC

Running checks

Check: Database component status - OK
Check: PDB Violations - OK
Check: Invalid System Objects - OK
Check: Tablespace Status - OK
Check: Backup jobs - OK
Check: Temp file exists - OK
Check: Temp file online - OK
Check: Data Pump running - OK
Check: Container status - WARNING
Check: Oracle Database Keystore - OK
Check: Dictionary statistics gathering - OK
Check: Scheduled Jobs - WARNING
Check: GoldenGate triggers - OK
Check: Logminer DDL triggers - OK
Check: Check sys public grants - OK
Check: Statistics gathering running - OK
Check: Optim dictionary upgrade parameter - OK
Check: Symlinks on oracle home path - OK
Check: Central Inventory - OK
Check: Oracle Database Vault Enabled - OK
Check: Queryable Inventory dba directories - OK
Check: Queryable Inventory locks - OK
Check: Queryable Inventory package - OK
Check: Queryable Inventory external table - OK
Check: Imperva processes - OK
Check: Guardium processes - OK
Check: Locale - OK
```

Review any warnings before proceeding.

In this environment, the sanity check reports warnings related to the container state and scheduled jobs.

Ensure that all pluggable databases that must receive SQL patch changes are in an appropriate open mode before running Datapatch.

### Apply Datapatch

Run Datapatch once:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ $ORACLE_HOME/OPatch/datapatch -verbose
```

The final Datapatch execution should detect the installed **19.28 Database Release Update** and **19.28 OJVM Release Update**.

Example:

```text
SQL Patching tool version 19.28.0.0.0 Production on Thu Feb 12 19:02:55 2026

Connecting to database...OK
Gathering database info...done

Bootstrapping registry and package to current versions...done
Determining current state...done

Current state of interim SQL patches:

Interim patch 37847857 (OJVM RELEASE UPDATE: 19.28.0.0.250715 (37847857)):
  Binary registry: Installed
  PDB CDB$ROOT: Not installed
  PDB PDB$SEED: Not installed
  PDB PDB1: Not installed

Current state of release update SQL patches:

  Binary registry:
    19.28.0.0.0 Release_Update 250705030417: Installed

Adding patches to installation queue and performing prereq checks...done

Installation queue:
  For the following PDBs: CDB$ROOT PDB$SEED PDB1
    No interim patches need to be rolled back
    Patch 37960098 (Database Release Update : 19.28.0.0.250715 (37960098)):
      Apply from 19.25.0.0.0 Release_Update 241010184253 to 19.28.0.0.0 Release_Update 250705030417
    The following interim patches will be applied:
      37847857 (OJVM RELEASE UPDATE: 19.28.0.0.250715 (37847857))

Installing patches...
Patch installation complete.  Total patches installed: 6

Validating logfiles...done

Patch 37960098 apply (pdb CDB$ROOT): SUCCESS
Patch 37847857 apply (pdb CDB$ROOT): SUCCESS

Patch 37960098 apply (pdb PDB$SEED): SUCCESS
Patch 37847857 apply (pdb PDB$SEED): SUCCESS

Patch 37960098 apply (pdb PDB1): SUCCESS
Patch 37847857 apply (pdb PDB1): SUCCESS

SQL Patching tool complete on Thu Feb 12 19:17:54 2026
```

Verify that all required SQL patch operations report:

```text
SUCCESS
```

## Perform the Final Post-Patch Verification

After patching both RAC nodes and completing Datapatch, verify the Database Home, Grid Infrastructure Home, database SQL patch registry, and Clusterware state.

### Verify the Database Home on Node 1

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ opatch lspatches
37847857;OJVM RELEASE UPDATE: 19.28.0.0.250715 (37847857)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)

OPatch succeeded.
```

### Verify the Database Home on Node 2

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ opatch lspatches
37847857;OJVM RELEASE UPDATE: 19.28.0.0.250715 (37847857)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)

OPatch succeeded.
```

### Verify the Grid Infrastructure Home on Node 1

Set the Grid Infrastructure environment:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ . oraenv <<< +ASM1
```

Verify the patch inventory:

```text
38124772;TOMCAT RELEASE UPDATE 19.0.0.0.0 (38124772)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37962938;ACFS RELEASE UPDATE 19.28.0.0.0 (37962938)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)
36758186;DBWLM RELEASE UPDATE 19.0.0.0.0 (36758186)

OPatch succeeded.
```

### Verify the Grid Infrastructure Home on Node 2

Set the Grid Infrastructure environment:

```bash
oracle@ol8-19-rac2 cdbrac2 > ~ $ . oraenv <<< +ASM2
```

Verify the patch inventory:

```text
38124772;TOMCAT RELEASE UPDATE 19.0.0.0.0 (38124772)
37962946;OCW RELEASE UPDATE 19.28.0.0.0 (37962946)
37962938;ACFS RELEASE UPDATE 19.28.0.0.0 (37962938)
37960098;Database Release Update : 19.28.0.0.250715 (37960098)
36758186;DBWLM RELEASE UPDATE 19.0.0.0.0 (36758186)

OPatch succeeded.
```

## Verify the SQL Patch Registry

Connect to the database:

```bash
oracle@ol8-19-rac1 cdbrac1 > ~ $ sql / as sysdba
```

Verify the SQL patch history:

```sql
SQL> select patch_id,
  2         patch_uid,
  3         action,
  4         to_char(action_time,'dd.mm.yyyy hh24:mi:ss') as "patch time",
  5         source_version,
  6         target_version,
  7         status
  8  from sys.dba_registry_sqlpatch;
```

Example output:

```text
   PATCH_ID    PATCH_UID      ACTION             patch time    SOURCE_VERSION    TARGET_VERSION     STATUS
___________ ____________ ___________ ______________________ _________________ _________________ __________
   36878697     25797620 APPLY       25.01.2026 16:42:45    19.1.0.0.0        19.25.0.0.0       SUCCESS
   36912597     25871884 APPLY       25.01.2026 17:01:10    19.1.0.0.0        19.25.0.0.0       SUCCESS
   36878697     25797620 ROLLBACK    12.02.2026 01:31:43    19.28.0.0.0       19.28.0.0.0       SUCCESS
   37847857     27534561 APPLY       12.02.2026 19:07:08    19.25.0.0.0       19.28.0.0.0       SUCCESS
   37960098     27635722 APPLY       12.02.2026 19:10:41    19.25.0.0.0       19.28.0.0.0       SUCCESS
```

Verify that the final OJVM and Database Release Update entries report:

```text
37847857  APPLY  SUCCESS
37960098  APPLY  SUCCESS
```

## Verify the Cluster Patch State

Set the Grid Infrastructure environment:

```bash
oracle@ol8-19-rac1 +ASM > ~ $ . oraenv <<< +ASM2
ORACLE_SID = [+ASM] ? The Oracle base remains unchanged with value /u01/app/oracle
```

Check the active Clusterware version and patch state:

```bash
oracle@ol8-19-rac1 +ASM1 > ~ $ crsctl query crs activeversion -f
Oracle Clusterware active version on the cluster is [19.0.0.0.0]. The cluster upgrade state is [NORMAL]. The cluster active patch level is [880628325].
```

Verify that the cluster reports:

```text
NORMAL
```

The `NORMAL` state confirms that the rolling patch cycle has completed and that both nodes are operating at the same Clusterware patch level.

## Run the CVU Post-Patch Validation

Run the Cluster Verification Utility post-patch check:

```bash
oracle@ol8-19-rac1 +ASM1 > ~ $ /u01/app/19.0.0/grid/bin/cluvfy stage -post patch
```

Example output:

```text
Performing following verification checks ...

  cluster upgrade state ...PASSED
  Software home: /u01/app/19.0.0/grid ...PASSED

Post-check for Patch Application was successful.

CVU operation performed:      stage -post patch
Date:                         Feb 12, 2026 7:21:40 PM
CVU version:                  19.28.0.0.0 (070125x8664)
Clusterware version:          19.0.0.0.0
CVU home:                     /u01/app/19.0.0/grid
Grid home:                    /u01/app/19.0.0/grid
User:                         oracle
Operating system:             Linux5.15.0-202.135.2.el8uek.x86_64
```

Verify that the following message is returned:

```text
Post-check for Patch Application was successful.
```

## Conclusion

After completing the patching on both RAC nodes, the cluster returns to the `NORMAL` state, confirming that both nodes are operating at the same patch level.

The Database Homes contain the **19.28 Database Release Update** and **19.28 OJVM Release Update**, and the Grid Infrastructure Homes contain the corresponding **19.28 Grid Infrastructure Release Update** components.

The SQL patch registry confirms that the Database Release Update and OJVM SQL changes were applied successfully.

The final `cluvfy` post-patch validation also completes successfully.

The Oracle RAC environment is now updated to **Oracle Database and Grid Infrastructure 19.28** and is ready for normal operation.