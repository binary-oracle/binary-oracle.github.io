---
title: "How to Configure Oracle ASM Dynamic Volume Manager (ADVM) and Oracle ACFS"
description: "Step-by-step guide to configuring Oracle ASM Dynamic Volume Manager (ADVM), creating an ASM volume, and managing an Oracle ACFS filesystem with Oracle Clusterware."
pubDate: 2026-10-10
tags:
  - Oracle ASM
  - Oracle ADVM
  - Oracle ACFS
  - Oracle Grid Infrastructure
  - Oracle Linux
---

Oracle ASM Dynamic Volume Manager (**ADVM**) provides volume management on top of Oracle Automatic Storage Management (ASM) disk groups. An ADVM volume can be formatted with **Oracle ASM Cluster File System (ACFS)** to provide a general-purpose filesystem. In a clustered environment, Oracle Clusterware can manage the filesystem and mount it on multiple nodes.

This guide demonstrates the configuration using an existing two-node RAC. The same concepts apply to other supported configurations, subject to the Oracle Grid Infrastructure, operating system, and kernel compatibility requirements.

## Environment and Prerequisites

The demonstration environment uses:

| Component | Configuration |
| --- | --- |
| Operating system | Oracle Linux 9 with UEK |
| Grid Infrastructure | Oracle Grid Infrastructure 19c (RU 19.32) |
| Cluster nodes | `rac-node1`, `rac-node2` |
| ASM disk group | `DG_DATA` (EXTERNAL redundancy) |
| ADVM volume | `SHARED` |
| Volume size | 5120 MB (5 GB) |
| Filesystem | Oracle ACFS |
| Mount point | `/shared` |

The hostnames `rac-node1` and `rac-node2` are example node names. The existing ASM disk group must have sufficient free space and an appropriate `compatible.advm` setting. The ACFS drivers must support the running kernel. This example assumes Grid Infrastructure and ASM are already installed and working on both nodes.

**Important:** Check Oracle's certification and licensing requirements for your particular Grid Infrastructure release, operating system, and kernel before using ADVM or ACFS in production. Commands that create volumes or format filesystems must be run against the intended devices, formatting an existing filesystem destroys its contents.

## Oracle ACFS Requirements and Compatibility

Before creating an ADVM volume or formatting it with ACFS, verify the Oracle ASM disk group compatibility, Grid Infrastructure version, operating system, kernel, and required drivers. The following minimum values are documented by Oracle for the **basic ADVM volume capability**, they do not guarantee that every ACFS feature is available or that a particular OS/kernel combination is certified.

### Minimum Disk Group Compatibility

| Attribute | Minimum for basic ADVM | Purpose |
| --- | --- | --- |
| `compatible.asm` | `11.2` | Enables the ASM functionality required for ADVM volumes. |
| `compatible.advm` | `11.2` | Enables ADVM volume creation in the disk group. |
| `compatible.rdbms` | No additional ADVM-specific minimum | Controls the minimum database compatibility for databases accessing the disk group, it is not the ACFS feature version. |

`compatible.asm` must be **greater than or equal to** both `compatible.advm` and `compatible.rdbms`. Oracle also specifies that Grid Infrastructure 12.2.0.1 and later requires at least `11.2.0.2` for `compatible.asm`, therefore, the historical `11.2` ADVM feature minimum must not be confused with the minimum accepted by a newer Grid Infrastructure release.

### Compatibility Requirements for Selected ACFS Features

Oracle documents additional minimum disk group compatibility values for specific ACFS capabilities:

| Feature | Minimum `compatible.asm` | Minimum `compatible.advm` |
| --- | --- | --- |
| Basic ADVM volumes | `11.2` | `11.2` |
| Read-only ACFS snapshots | `11.2.0.2` | `11.2.0.2` |
| Read-write ACFS snapshots | `11.2.0.3` | `11.2.0.3` |
| ACFS compression | `12.2` | `12.2` |
| ACFS automatic resize | `12.2` | `12.2` |
| ACFS support for 4 KB sectors | `12.2` | `12.2` |
| ACFS filesystem size reduction | `18.0` | `18.0` |

These are **feature compatibility thresholds**, not a complete certification matrix. Some capabilities have additional operating system, release, licensing, and workload restrictions. Consult the feature table for the installed Grid Infrastructure release before enabling advanced options.

### ACFS Usage Restrictions

Oracle ACFS is intended for supported general-purpose and Oracle-related filesystem workloads. It **must not** be used for Oracle Cluster Registry (OCR), voting files, or Oracle ASM management files such as the Grid Infrastructure home. Oracle also documents restrictions on ACFS encryption and replication for database-related files. Storing Oracle database files on ACFS has additional release- and configuration-specific support requirements, do not assume that every ACFS mount is a supported database file location.

**Important:** Compatibility attributes can generally be increased but not lowered. Review all databases, cluster nodes, and upgrade requirements before changing them. This guide only verifies existing values, it does not change compatibility settings.

Official Oracle documentation:

- [Oracle 19c — Introducing Oracle ACFS and Oracle ADVM](https://docs.oracle.com/en/database/oracle/oracle-database/19/ostmg/intro-acfs-advm.html)
- [Oracle 19c — Administering ASM Disk Groups](https://docs.oracle.com/en/database/oracle/oracle-database/19/ostmg/admin-asm-diskgroups.html)
- [Oracle 19c — Overview of Oracle ADVM](https://docs.oracle.com/en/database/oracle/oracle-database/19/ostmg/overview-advm.html)

## Verify Grid Infrastructure and ACFS Support

Check the active Oracle Clusterware version:

```bash
[oracle@rac-node2 ~]$ crsctl query crs activeversion
Oracle Clusterware active version on the cluster is [19.0.0.0.0]
```

The active version identifies the cluster compatibility version, it is not necessarily the installed release update level. In this environment, the ACFS driver reports version **19.32.0.0.0**.

Check whether the ACFS driver is installed, supported, and loaded:

```bash
[root@rac-node2 ~]# acfsdriverstate installed
ACFS-9203: true

[root@rac-node2 ~]# acfsdriverstate supported
ACFS-9200: Supported

[root@rac-node2 ~]# acfsdriverstate loaded
ACFS-9203: true

[root@rac-node2 ~]# acfsdriverstate version -v
ACFS-9325:     Driver OS kernel version = 6.12.0-0.20.20.el9uek.x86_64.
ACFS-9326:     Driver build number = 260602.
ACFS-9231:     Driver build version = 19.0.0.0.0 (19.32.0.0.0).
ACFS-9547:     Driver available build number = 260602.
ACFS-9232:     Driver available build version = 19.0.0.0.0 (19.32.0.0.0).
ACFS-9549:     Kernel and command versions.
Kernel:
    Build version: 19.0.0.0.0
    Build full version: 19.32.0.0.0
    Build hash:    9256567290
    Bug numbers:   NoTransactionInformation
Commands:
    Build version: 19.0.0.0.0
    Build full version: 19.32.0.0.0
    Build hash:    9256567290
    Bug numbers:   NoTransactionInformation
```

The `installed` check confirms that the driver components are installed, `supported` checks support for the current environment, and `loaded` confirms that the driver is loaded. The verbose version command displays the kernel and driver build versions. In the tested environment, the driver reports a UEK `6.12.0-0.20.20.el9uek.x86_64` kernel and ACFS version `19.32.0.0.0`.

Check that the cluster services are online:

```bash
[oracle@rac-node2 ~]$ crsctl check cluster -all
**************************************************************
rac-node1:
CRS-4537: Cluster Ready Services is online
CRS-4529: Cluster Synchronization Services is online
CRS-4533: Event Manager is online
**************************************************************
rac-node2:
CRS-4537: Cluster Ready Services is online
CRS-4529: Cluster Synchronization Services is online
CRS-4533: Event Manager is online
```

Both nodes reported Cluster Ready Services, Cluster Synchronization Services, and Event Manager as online.

## Check ASM Disk Groups and Compatibility

Set the ASM environment on the node where the commands will be executed:

```bash
[root@rac-node2 ~]# su - oracle
[oracle@rac-node2 ~]$ . oraenv <<< +ASM2
```

Display the mounted ASM disk groups:

```bash
[oracle@rac-node2 ~]$ asmcmd lsdg
State    Type    Rebal  Sector  Logical_Sector  Block       AU  Total_MB  Free_MB  Req_mir_free_MB  Usable_file_MB  Offline                                                _disks  Voting_files  Name
MOUNTED  EXTERN  N         512             512   4096  4194304    204800   204420                0          204420                                                              0             Y  DG_CLU/
MOUNTED  EXTERN  N         512             512   4096  4194304   3072000  3042720                0         3042720                                                              0             N  DG_DATA/
MOUNTED  EXTERN  N         512             512   4096  4194304    409600   406712                0          406712                                                              0             N  DG_FRA/
```

The tested cluster has three mounted disk groups: `DG_CLU`, `DG_DATA`, and `DG_FRA`. The `DG_DATA` disk group has sufficient free space for the new volume.

Connect to ASM using the SYSASM privilege:

```bash
[oracle@rac-node2 ~]$ sqlplus / as sysasm
```

Check the disk group compatibility attributes:

```sql
SET LINESIZE 160
SET PAGESIZE 100

COLUMN diskgroup FORMAT A15
COLUMN attribute FORMAT A20
COLUMN value     FORMAT A18

SELECT dg.name AS diskgroup,
       a.name AS attribute,
       a.value
FROM v$asm_diskgroup dg
JOIN v$asm_attribute a
  ON dg.group_number = a.group_number
WHERE a.name IN (
    'compatible.asm',
    'compatible.rdbms',
    'compatible.advm'
)
ORDER BY dg.name, a.name;

DISKGROUP       ATTRIBUTE            VALUE
--------------- -------------------- ------------------
DG_CLU          compatible.advm      19.0.0.0.0
DG_CLU          compatible.asm       19.0.0.0.0
DG_CLU          compatible.rdbms     10.1.0.0.0
DG_DATA         compatible.advm      19.0.0.0.0
DG_DATA         compatible.asm       19.0.0.0.0
DG_DATA         compatible.rdbms     10.1.0.0.0
DG_FRA          compatible.advm      19.0.0.0.0
DG_FRA          compatible.asm       19.0.0.0.0
DG_FRA          compatible.rdbms     10.1.0.0.0

9 rows selected.
```

In this environment, `DG_DATA` reports `compatible.asm` and `compatible.advm` as `19.0.0.0.0`, while `compatible.rdbms` is `10.1.0.0.0`. The `compatible.advm` attribute enables ADVM functionality at the specified compatibility level.

Do not raise ASM compatibility attributes without reviewing the consequences, increasing compatibility can restrict the ability to use older Oracle software and is not generally reversible.

## Storage Redundancy and Production Considerations

In this demonstration, `asmcmd lsdg` reports `DG_DATA` with **EXTERN** redundancy. The created ADVM volume subsequently reports **UNPROT** (unprotected). These two values are related, but they describe different layers:

- **EXTERNAL redundancy** means Oracle ASM does not mirror the disk group. The storage array or other underlying storage solution is responsible for protection.
- **UNPROT** means the ADVM volume does not receive Oracle ASM mirroring. It does **not** prove that the underlying storage array has no RAID, replication, or other protection.
- **NORMAL** and **HIGH** ASM redundancy provide Oracle-managed mirroring when properly configured with suitable failure groups.

Oracle explicitly warns that selecting `--redundancy unprotected` for an ADVM volume is **not recommended for production**, because storage-access failures may lead to data loss. In particular, selecting an unprotected volume in a NORMAL redundancy disk group bypasses ASM mirroring for that volume. Oracle strongly recommends backups in this configuration.

**Production guidance:** Do not deploy an unprotected ADVM volume on storage without verified redundancy and recovery provisions. When using EXTERNAL redundancy, Oracle recommends protected underlying storage, such as RAID or equivalent storage-level data protection. Confirm the storage array's failure-domain design, multipathing, backup and restore procedures, and business recovery requirements. External redundancy with independently protected storage is not automatically unsuitable for production, the actual end-to-end protection must be assessed.

Oracle recommends allowing the ADVM volume to inherit the disk group's redundancy where applicable instead of explicitly forcing `--redundancy unprotected`. The example `volcreate` command does not explicitly request unprotected redundancy, the reported `UNPROT` results from the disk group's EXTERNAL redundancy.

Official references: [Oracle 19c ASM Administrator's Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/ostmg/automatic-storage-management-administrators-guide.pdf), [Oracle ASM storage requirements](https://docs.oracle.com/en/database/oracle/oracle-database/21/cwlin/identifying-storage-requirements-for-oracle-automatic-storage-management.html), and [Oracle ADVM volume management](https://docs.oracle.com/en/database/oracle/oracle-database/21/acfsg/manage-advm-asmcmd.html).

## Enable the ASM ADVM Proxy

Before creating the volume, check the ASM proxy resource:

```bash
[oracle@rac-node2 ~]$ crsctl stat res -t
--------------------------------------------------------------------------------
Name           Target  State        Server                   State details
--------------------------------------------------------------------------------
Local Resources
--------------------------------------------------------------------------------
ora.LISTENER.lsnr
               ONLINE  ONLINE       rac-node1                 STABLE
               ONLINE  ONLINE       rac-node2                 STABLE
ora.chad
               ONLINE  ONLINE       rac-node1                 STABLE
               ONLINE  ONLINE       rac-node2                 STABLE
ora.net1.network
               ONLINE  ONLINE       rac-node1                 STABLE
               ONLINE  ONLINE       rac-node2                 STABLE
ora.ons
               ONLINE  ONLINE       rac-node1                 STABLE
               ONLINE  ONLINE       rac-node2                 STABLE
ora.proxy_advm
               OFFLINE OFFLINE      rac-node1                 STABLE <<<< NOT RUNNING
               OFFLINE OFFLINE      rac-node2                 STABLE <<<< NOT RUNNING
--------------------------------------------------------------------------------
Cluster Resources
--------------------------------------------------------------------------------
ora.ASMNET1LSNR_ASM.lsnr(ora.asmgroup)
      1        ONLINE  ONLINE       rac-node1                 STABLE
      2        ONLINE  ONLINE       rac-node2                 STABLE
ora.DG_CLU.dg(ora.asmgroup)
      1        ONLINE  ONLINE       rac-node1                 STABLE
      2        ONLINE  ONLINE       rac-node2                 STABLE
ora.DG_DATA.dg(ora.asmgroup)
      1        ONLINE  ONLINE       rac-node1                 STABLE
      2        ONLINE  ONLINE       rac-node2                 STABLE
ora.DG_FRA.dg(ora.asmgroup)
      1        ONLINE  ONLINE       rac-node1                 STABLE
      2        ONLINE  ONLINE       rac-node2                 STABLE
ora.LISTENER_SCAN1.lsnr
      1        ONLINE  ONLINE       rac-node1                 STABLE
ora.LISTENER_SCAN2.lsnr
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.LISTENER_SCAN3.lsnr
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.asm(ora.asmgroup)
      1        ONLINE  ONLINE       rac-node1                 Started,STABLE
      2        ONLINE  ONLINE       rac-node2                 Started,STABLE
ora.asmnet1.asmnetwork(ora.asmgroup)
      1        ONLINE  ONLINE       rac-node1                 STABLE
      2        ONLINE  ONLINE       rac-node2                 STABLE
ora.cdmstest.db
      1        ONLINE  ONLINE       rac-node2                 Open,HOME=/opt/oracl
                                                             e/app/product/193000
                                                             /dbhome_1,STABLE
ora.cdmstest.dmstest_svc.svc
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.ci3test.db
      1        ONLINE  ONLINE       rac-node2                 Open,HOME=/opt/oracl
                                                             e/app/product/193000
                                                             /dbhome_1,STABLE
ora.ci3test.i3test_svc.svc
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.cibdev.db
      1        ONLINE  ONLINE       rac-node2                 Open,HOME=/opt/oracl
                                                             e/app/product/193000
                                                             /dbhome_1,STABLE
ora.cibdev.ibdev_svc.svc
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.cibtest.db
      1        ONLINE  ONLINE       rac-node2                 Open,HOME=/opt/oracl
                                                             e/app/product/193000
                                                             /dbhome_1,STABLE
ora.cibtest.ibtest_svc.svc
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.cvu
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.rac-node1.vip
      1        ONLINE  ONLINE       rac-node1                 STABLE
ora.rac-node2.vip
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.scan1.vip
      1        ONLINE  ONLINE       rac-node1                 STABLE
ora.scan2.vip
      1        ONLINE  ONLINE       rac-node2                 STABLE
ora.scan3.vip
      1        ONLINE  ONLINE       rac-node2                 STABLE
--------------------------------------------------------------------------------
```

Check whether the proxy resource is enabled:

```bash
[oracle@rac-node2 ~]$ crsctl stat res ora.proxy_advm -p | grep '^ENABLED='
ENABLED=0
```

Enable and start the proxy with `srvctl`:

```bash
[oracle@rac-node2 ~]$ srvctl enable asm -proxy
[oracle@rac-node2 ~]$ srvctl start asm -proxy
```

Verify the result:

```bash
[oracle@rac-node2 ~]$ crsctl stat res ora.proxy_advm -t
```

Expected result for this cluster:

```text
--------------------------------------------------------------------------------
Name           Target  State        Server                   State details
--------------------------------------------------------------------------------
Local Resources
--------------------------------------------------------------------------------
ora.proxy_advm
               ONLINE  ONLINE       rac-node1                 STABLE
               ONLINE  ONLINE       rac-node2                 STABLE
--------------------------------------------------------------------------------
```

## Create an ASM ADVM Volume

Check existing volumes:

```bash
[oracle@rac-node2 ~]$ asmcmd volinfo --all
no volumes found
```

### Recommended ADVM Volume Configuration

Oracle Grid Infrastructure 19c uses the following default striping configuration for ADVM volumes:

| Parameter | Oracle 19c Default | Description |
|---|---|---|
| Stripe columns | `8` | Number of columns across which volume data is striped |
| Stripe width | `1M` (1024 KB) | Amount of data written to each stripe column |
| Redundancy | Inherited from ASM disk group | Uses the disk group's redundancy configuration |
| Volume size | Workload-dependent | Selected according to capacity requirements |

The default configuration uses **8 stripe columns** and a **1 MB stripe width**.

These settings are suitable for general-purpose workloads. Adjust them only when workload testing or specific application requirements justify a different configuration.

Create a 5 GB volume named `SHARED` in the `DG_DATA` disk group:

```bash
[oracle@rac-node2 ~]$ asmcmd volcreate -G DG_DATA -s 5G SHARED
```

The command arguments are:

- `-G DG_DATA`: Specifies the target ASM disk group.
- `-s 5G`: Allocates a 5 GB volume (5120 MB).
- `SHARED`: Specifies the ADVM volume name.

Oracle automatically applies the default stripe configuration when the striping options are omitted.

Alternatively, you can explicitly specify the same settings:

```bash
[oracle@rac-node2 ~]$ asmcmd volcreate -G DG_DATA \
  -s 5120M \
  --column 8 \
  --width 1024K \
  SHARED
```

**Note:** Execute only one of the two volume creation commands.


### Verify the ADVM Volume

Verify the newly created volume:

```bash
[oracle@rac-node2 ~]$ asmcmd volinfo -G DG_DATA SHARED
Diskgroup Name: DG_DATA

         Volume Name: SHARED
         Volume Device: /dev/asm/shared-14
         State: ENABLED
         Size (MB): 5120
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage:
         Mountpath:
```

The output confirms that the volume was successfully created with:

- **Volume size:** 5120 MB (5 GB)
- **Stripe columns:** 8
- **Stripe width:** 1024 KB (1 MB)
- **Device:** `/dev/asm/shared-14`
- **State:** `ENABLED`

The volume is now available as a block device at `/dev/asm/shared-14`. The device suffix is assigned by the system and may differ in other environments. `UNPROT` means the ADVM volume has no Oracle ASM mirroring. Because `DG_DATA` uses EXTERNAL redundancy, protection—if any—must come from the underlying storage. See the production redundancy discussion above, do not assume the storage is protected simply because the disk group is mounted.

Check the device:

```bash
[oracle@rac-node2 ~]$ ls -l /dev/asm/shared-14
brwxrwx---. 1 root asmadmin 250, 7169 Oct  6 12:22 /dev/asm/shared-14
```

## Create the Oracle ACFS Filesystem

An ADVM volume is a block device, not yet a mounted filesystem. Before formatting it, verify that the correct volume has been selected and that it contains no data that must be preserved.

Format the volume with ACFS:

```bash
[oracle@rac-node2 ~]$ mkfs -t acfs /dev/asm/shared-14
mkfs.acfs: version         = 19.0.0.0.0
mkfs.acfs: on-disk version = 46.0
mkfs.acfs: volume         = /dev/asm/shared-14
mkfs.acfs: volume size    = 5368709120 (5.00 GB)
mkfs.acfs: Format complete.
```

The `mkfs -t acfs` command creates an ACFS filesystem on the ADVM volume. **Do not run it again on a volume containing data.**

After mounting, inspect the ACFS filesystem using its mount point, for example `acfsutil info fs /shared`.

```bash
[oracle@rac-node2 ~]$ asmcmd volinfo -G DG_DATA SHARED
Diskgroup Name: DG_DATA

         Volume Name: SHARED
         Volume Device: /dev/asm/shared-14
         State: ENABLED
         Size (MB): 5120
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath:
```

## Create the Mount Point on Each Node

Create the same directory on every node that will mount the shared filesystem. Creating a mount point directly under `/` requires elevated permissions.

On **both nodes**, run as `root`:

```bash
[root@rac-node1 ~]# mkdir -p /shared
[root@rac-node2 ~]# mkdir -p /shared
```

`mkdir -p` creates the mount point if it does not already exist. This directory is local to each node, once ACFS is mounted, both directories provide access to the same shared filesystem.

## Register ACFS with Oracle Clusterware

Registering the filesystem with Oracle Clusterware allows the cluster to manage the mount as a resource, including its dependency on the ASM volume.

Run the registration as `root`, with the Grid Infrastructure binaries available in the environment:

```bash
[root@rac-node2 ~]# srvctl add filesystem \
  -volume SHARED \
  -diskgroup DG_DATA \
  -path /shared \
  -mountowner oracle \
  -mountgroup oinstall \
  -mountperm 775 \
  -fstype ACFS \
  -autostart ALWAYS
```

The options specify:

- `-volume SHARED` and `-diskgroup DG_DATA`: the existing ASM volume.
- `-path /shared`: filesystem mount point.
- `-mountowner oracle`: owner of the mounted filesystem's root directory.
- `-mountgroup oinstall`: group assigned to the mount point.
- `-mountperm 775`: owner and group have read, write, and execute permissions, others have read and execute permissions.
- `-fstype ACFS`: filesystem type.
- `-autostart ALWAYS`: configure Clusterware to start the filesystem automatically according to its resource dependencies and cluster state.

The permissions and ownership are demonstration values. Adjust them to the application's security requirements.

Verify the registered configuration:

```bash
[root@rac-node2 ~]# srvctl config filesystem volume SHARED -diskgroup DG_DATA
Volume device: /dev/asm/shared-14
Diskgroup name: dg_data
Volume name: shared
Canonical volume device: /dev/asm/shared-14
Accelerator volume devices:
Mountpoint path: /shared
Mount point owner: oracle
Mount point group: oinstall
Mount permissions: owner:oracle:rwx,pgrp:oinstall:rwx,other::r-x
Mount users:
Type: ACFS
Mount options:
Description:
ACFS file system is enabled
ACFS file system is individually enabled on nodes:
ACFS file system is individually disabled on nodes:
```

The test confirms the device `/dev/asm/shared-14`, mount point `/shared`, filesystem type `ACFS`, and owner/group `oracle:oinstall`.

## Start ACFS on the Cluster

Start the registered filesystem using `srvctl`:

```bash
[oracle@rac-node1 ~]$ srvctl start filesystem -volume SHARED -diskgroup DG_DATA
```

Verify the Clusterware resources:

```bash
[oracle@rac-node1 ~]$ crsctl stat res -t | grep -i -A3 shared

ora.DG_DATA.SHARED.advm
    ONLINE  ONLINE  rac-node1  STABLE
    ONLINE  ONLINE  rac-node2  STABLE

ora.dg_data.shared.acfs
    ONLINE  ONLINE  rac-node1  mounted on /shared,STABLE
    ONLINE  ONLINE  rac-node2  mounted on /shared,STABLE
```

Check the filesystem status directly:

```bash
[oracle@rac-node1 ~]$ srvctl status filesystem -volume SHARED -diskgroup DG_DATA
ACFS file system /shared is mounted on nodes rac-node1,rac-node2
```

This confirms that Oracle Clusterware reports the filesystem mounted on both nodes.

## Verify the Mounted Filesystem

Check the mount on each node:

```bash
[oracle@rac-node1 ~]$ df -hT /shared
[oracle@rac-node1 ~]$ findmnt /shared
[oracle@rac-node1 ~]$ ls -ld /shared
Filesystem         Type  Size  Used Avail Use% Mounted on
/dev/asm/shared-14 acfs  5.0G  559M  4.5G  11% /shared
TARGET  SOURCE             FSTYPE OPTIONS
/shared /dev/asm/shared-14 acfs   rw,relatime,seclabel,device,rootsuid,ordered
drwxrwxr-x. 4 oracle oinstall 32768 Oct  6 12:51 /shared
```

The mounted directory was owned by `oracle:oinstall` with permissions corresponding to `775`.

Repeat the checks on the second node:

```bash
[oracle@rac-node2 ~]$ df -hT /shared
[oracle@rac-node2 ~]$ findmnt /shared
Filesystem         Type  Size  Used Avail Use% Mounted on
/dev/asm/shared-14 acfs  5.0G  559M  4.5G  11% /shared
TARGET  SOURCE             FSTYPE OPTIONS
/shared /dev/asm/shared-14 acfs   rw,relatime,seclabel,device,rootsuid,ordered
```

For an additional functional test, create a harmless test file on one node and confirm that it is visible on the other node. Remove the test file afterward. The supplied test log confirms the Clusterware mount status on both nodes.

## Summary

This example configured a 5 GB Oracle ADVM volume named `SHARED` in the `DG_DATA` disk group, formatted it with Oracle ACFS, and registered it with Oracle Clusterware. The filesystem was then mounted at `/shared` on both nodes of the demonstration cluster.

ADVM provides the volume layer on top of ASM, ACFS provides the filesystem, and Oracle Clusterware manages the filesystem resource across the cluster. In production, validate kernel compatibility, storage redundancy, mount permissions, backups, and application requirements before deploying the configuration. The demonstration volume is `UNPROT`. Oracle warns against unprotected ADVM configurations without adequate protection, and the underlying storage protection must be verified independently.

## References

- [Oracle Automatic Storage Management Administrator's Guide 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/ostmg/)
- [Oracle Grid Infrastructure Installation and Upgrade Guide 19c for Linux](https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/)
- [Oracle 19c ASM Administrator’s Guide — volume management and redundancy](https://docs.oracle.com/en/database/oracle/oracle-database/19/ostmg/automatic-storage-management-administrators-guide.pdf)
- [Oracle documentation — ADVM unprotected redundancy warning](https://docs.oracle.com/en/database/oracle/oracle-database/21/acfsg/manage-advm-asmcmd.html)
- [Oracle documentation — ASM storage redundancy requirements](https://docs.oracle.com/en/database/oracle/oracle-database/21/cwlin/identifying-storage-requirements-for-oracle-automatic-storage-management.html)
- [Oracle 19c — Oracle ACFS and Oracle ADVM](https://docs.oracle.com/en/database/oracle/oracle-database/19/ladbi/oracle-acfs-and-oracle-advm.html)
