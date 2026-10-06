---
title: "Online Oracle ACFS Storage Migration to New SAN Storage"
description: "Step-by-step guide to performing an online migration of the storage underlying Oracle ACFS to new SAN storage using Linux multipath, udev, and Oracle ASM rebalance without disrupting the live production workload."
pubDate: 2026-09-24
tags:
  - Oracle
  - Oracle ACFS
  - Oracle ASM
  - Oracle ADVM
  - Oracle Grid Infrastructure
  - Linux
  - Multipath
  - udev
  - Storage Migration
---

This guide demonstrates how to perform an **online storage migration** of an Oracle ASM disk group hosting Oracle ACFS file systems from an existing SAN LUN to a new storage LUN.

The environment consists of a **two-node active/passive cluster** using Oracle Grid Infrastructure 19c, Oracle Automatic Storage Management (ASM), Oracle ASM Dynamic Volume Manager (ADVM), and Oracle Automatic Storage Management Cluster File System (ACFS).

The migration was performed **online without disrupting the live production workload**. The ACFS file systems remained mounted and available while Oracle ASM redistributed the allocated extents from the existing storage to the replacement storage.

The ADVM volumes and ACFS file systems were not recreated, and the application-facing mount points remained unchanged.

The migration followed this path:

```text
Existing SAN
     │
     │  Present new SAN LUN
     │  Verify multipath on both nodes
     │  Configure + verify udev on both nodes
     │  Verify permissions
     │  Verify ASM CANDIDATE
     │
     ├──── ADD DISK
     │
     │     Online ASM rebalance
     │     Verify data distribution
     │
     ├──── DROP old disk
     │
     │     Online ASM rebalance
     │
     │     Verify ASM / ADVM / ACFS
     │
     ▼
   New SAN
```

> **Important:** This article documents the procedure used in this environment. Storage migrations should be tested and validated for the target environment, and appropriate backup and recovery procedures should be available before modifying ASM storage.

## Verify the Existing ASM Configuration

The ASM disk group used in this migration is `DATA`.

Before making any storage changes, verify the existing disk group.

```text
oracle@node01 // +ASM2 // ~ $ asmcmd lsdg
State    Type    Rebal  Sector  Logical_Sector  Block       AU  Total_MB  Free_MB  Req_mir_free_MB  Usable_file_MB  Offline_disks  Voting_files  Name
MOUNTED  EXTERN  N         512             512   4096  4194304   1048576   131228                0          131228              0             Y  DATA/
```

The `DATA` disk group uses external redundancy and has a total capacity of 1 TiB.

Verify the current ASM disk:

```text
oracle@node01 // +ASM2 // ~ $ asmcmd lsdsk -p
Group_Num  Disk_Num      Incarn  Mount_Stat  Header_Stat  Mode_Stat  State   Path
        1         1  1785273564  CACHED      MEMBER       ONLINE     NORMAL  /dev/asm-disk2
```

Before the migration, `/dev/asm-disk2` is the ASM disk backing the `DATA` disk group.

## Verify the Existing ADVM Volumes

Before changing the underlying ASM storage, record the existing ADVM volume configuration.

```text
oracle@node01 // +ASM2 // ~ $ asmcmd volinfo --all
Diskgroup Name: DATA

         Volume Name: DATA02
         Volume Device: /dev/asm/data02-88
         State: ENABLED
         Size (MB): 256000
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u02/app/oracle/oradata

         Volume Name: DATA04
         Volume Device: /dev/asm/data04-88
         State: ENABLED
         Size (MB): 256000
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u04/app/oracle/oradata

         Volume Name: DPDUMP03
         Volume Device: /dev/asm/dpdump03-88
         State: ENABLED
         Size (MB): 102400
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u03/app/oracle/dpdump

         Volume Name: FRA02
         Volume Device: /dev/asm/fra02-88
         State: ENABLED
         Size (MB): 102400
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u02/app/oracle/fast_recovery_area

         Volume Name: FRA04
         Volume Device: /dev/asm/fra04-88
         State: ENABLED
         Size (MB): 102400
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u04/app/oracle/fast_recovery_area

         Volume Name: ols
         Volume Device: /dev/asm/ols-88
         State: ENABLED
         Size (MB): 51200
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u03/app/ols_old
```

The `DATA` disk group contains six ADVM volumes used by ACFS.

## Verify the Existing ACFS Configuration

Use `acfsutil info fs` to record the complete ACFS configuration before starting the migration.

```text
oracle@node01 // +ASM2 // ~ $ acfsutil info fs
/u03/app/oracle/dpdump
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Feb 10 15:14:20 2020
    mount time:      Wed Mar 18 16:55:40 2026
    mount sequence number: 0
    number of nodes:       2
    metadata block size:   4096
    volumes:      1
    total size:   107374182400  ( 100.00 GB )
    total free:   86482481152  (  80.54 GB )
    file entry table allocation: 393216
    primary volume: /dev/asm/dpdump03-88
        label:
        state:                 Available
        major, minor:          250, 45059
        logical sector size:   512
        size:                  107374182400  ( 100.00 GB )
        free:                  86482481152  (  80.54 GB )
        metadata read I/O count:         337710
        metadata write I/O count:        21
        total metadata bytes read:       1383264256  (   1.29 GB )
        total metadata bytes written:    90112  (  88.00 KB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u03/app/ols_old
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Mar  9 13:03:08 2020
    mount time:      Wed Mar 18 16:55:45 2026
    mount sequence number: 1
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   53687091200  (  50.00 GB )
    total free:   52379095040  (  48.78 GB )
    file entry table allocation: 721813504
    primary volume: /dev/asm/ols-88
        label:
        state:                 Available
        major, minor:          250, 45060
        logical sector size:   512
        size:                  53687091200  (  50.00 GB )
        free:                  52379095040  (  48.78 GB )
        metadata read I/O count:         337706
        metadata write I/O count:        21
        total metadata bytes read:       1383247872  (   1.29 GB )
        total metadata bytes written:    90112  (  88.00 KB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u04/app/oracle/fast_recovery_area
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Fri Jul  3 16:10:17 2020
    mount time:      Wed Mar 18 16:55:49 2026
    mount sequence number: 2
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   107374182400  ( 100.00 GB )
    total free:   37063405568  (  34.52 GB )
    file entry table allocation: 33947648
    primary volume: /dev/asm/fra04-88
        label:
        state:                 Available
        major, minor:          250, 45062
        logical sector size:   512
        size:                  107374182400  ( 100.00 GB )
        free:                  37063405568  (  34.52 GB )
        metadata read I/O count:         398607
        metadata write I/O count:        10533
        total metadata bytes read:       1650372608  (   1.54 GB )
        total metadata bytes written:    62287872  (  59.40 MB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u02/app/oracle/fast_recovery_area
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Feb  3 16:44:25 2020
    mount time:      Wed Mar 18 16:55:54 2026
    mount sequence number: 3
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   107374182400  ( 100.00 GB )
    total free:   74281836544  (  69.18 GB )
    file entry table allocation: 25559040
    primary volume: /dev/asm/fra02-88
        label:
        state:                 Available
        major, minor:          250, 45057
        logical sector size:   512
        size:                  107374182400  ( 100.00 GB )
        free:                  74281836544  (  69.18 GB )
        metadata read I/O count:         395739
        metadata write I/O count:        5529
        total metadata bytes read:       1626898432  (   1.52 GB )
        total metadata bytes written:    29290496  (  27.93 MB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u04/app/oracle/oradata
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Fri Jul  3 16:10:28 2020
    mount time:      Wed Mar 18 16:55:58 2026
    mount sequence number: 4
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   268435456000  ( 250.00 GB )
    total free:   54544441344  (  50.80 GB )
    file entry table allocation: 17170432
    primary volume: /dev/asm/data04-88
        label:
        state:                 Available
        major, minor:          250, 45061
        logical sector size:   512
        size:                  268435456000  ( 250.00 GB )
        free:                  54544441344  (  50.80 GB )
        metadata read I/O count:         392050
        metadata write I/O count:        8364
        total metadata bytes read:       1641287680  (   1.53 GB )
        total metadata bytes written:    126824448  ( 120.95 MB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u02/app/oracle/oradata
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Feb  3 16:43:54 2020
    mount time:      Wed Mar 18 16:56:03 2026
    mount sequence number: 5
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   268435456000  ( 250.00 GB )
    total free:   53886533632  (  50.19 GB )
    file entry table allocation: 17170432
    primary volume: /dev/asm/data02-88
        label:
        state:                 Available
        major, minor:          250, 45058
        logical sector size:   512
        size:                  268435456000  ( 250.00 GB )
        free:                  53886533632  (  50.19 GB )
        metadata read I/O count:         384126
        metadata write I/O count:        9310
        total metadata bytes read:       1583951872  (   1.48 GB )
        total metadata bytes written:    80900096  (  77.15 MB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED
```

This provides the baseline against which the post-migration configuration can be compared.

## Verify the Existing udev Configuration

The ASM disks are presented through persistent udev symbolic links.

```text
[root@node01 ~]# cat /etc/udev/rules.d/96-asm.rules
ACTION=="add|change", ENV{DM_UUID}=="mpath-36000144000000010f01ce376b18ad562", SYMLINK+="asm-disk2", GROUP="dba", OWNER="oracle", MODE="0660"
```

The existing `/dev/asm-disk2` device is backed by the SAN storage that will be replaced.

## Present the New PowerStore LUN

The replacement storage is a 1 TiB Dell EMC PowerStore LUN.

After the LUN has been presented to the servers, verify that Linux Device Mapper Multipath detects it.

```text
[root@node01 ~]# multipath -ll
mpathc (368ccf098009560fdefdb7be1386fcf04) dm-6 DellEMC ,PowerStore
size=1.0T features='1 queue_if_no_path' hwhandler='0' wp=rw
|-+- policy='queue-length 0' prio=50 status=active
| |- 9:0:12:1 sdg                8:96      active ready running
| `- 9:0:10:1 sdc                8:32      active ready running
`-+- policy='queue-length 0' prio=10 status=enabled
  |- 9:0:11:1 sdd                8:48      active ready running
  `- 9:0:17:1 sdh                8:112     active ready running

mpathb (36000144000000010f01ce376b18ad562) dm-2 EMC     ,Invista
size=1.0T features='1 queue_if_no_path' hwhandler='0' wp=rw
`-+- policy='service-time 0' prio=1 status=active
  |- 10:0:0:0 sde                8:64      active ready running
  `- 10:0:1:0 sdf                8:80      active ready running
```

The storage can now be distinguished as:

```text
Existing storage:
  Multipath device: mpathb
  WWID:             36000144000000010f01ce376b18ad562
  Storage:          EMC Invista
  Size:             1 TiB

Replacement storage:
  Multipath device: mpathc
  WWID:             368ccf098009560fdefdb7be1386fcf04
  Storage:          Dell EMC PowerStore
  Size:             1 TiB
```

## Verify the Block Device Layout

Use `lsblk` to verify the physical paths and multipath devices.

```text
[root@node01 ~]# lsblk -o NAME,KNAME,TYPE,SIZE,VENDOR,MODEL
NAME                    KNAME           TYPE    SIZE VENDOR   MODEL
sdf                     sdf             disk      1T EMC      Invista
└─mpathb                 dm-2            mpath     1T
asm!data04-88           asm!data04-88   disk    250G
sdd                     sdd             disk      1T DellEMC  PowerStore
└─mpathc                 dm-6            mpath     1T
sdb                     sdb             disk  447.1G ATA      INTEL SSDSCKKB48
└─md126                  md126           raid1 424.8G
  ├─md126p2              md126p2         md      500M
  ├─md126p3              md126p3         md       86G
  │ ├─vg_system-lv_swap  dm-1            lvm      16G
  │ ├─vg_system-lv_u01   dm-4            lvm     135G
  │ ├─vg_system-lv_root  dm-0            lvm      15G
  │ └─vg_system-lv_home  dm-3            lvm       5G
  ├─md126p1              md126p1         md      500M
  └─md126p4              md126p4         md      100G
    ├─vg_system-lv_u01   dm-4            lvm     135G
    └─vg_system-lv_tmp   dm-5            lvm      15G
asm!fra02-88            asm!fra02-88    disk    100G
asm!dpdump03-88         asm!dpdump03-88 disk    100G
sdg                     sdg             disk      1T DellEMC  PowerStore
└─mpathc                 dm-6            mpath     1T
sde                     sde             disk      1T EMC      Invista
└─mpathb                 dm-2            mpath     1T
asm!fra04-88            asm!fra04-88    disk    100G
sdc                     sdc             disk      1T DellEMC  PowerStore
└─mpathc                 dm-6            mpath     1T
asm!ols-88              asm!ols-88      disk     50G
asm!data02-88           asm!data02-88   disk    250G
sda                     sda             disk  447.1G ATA      INTEL SSDSCKKB48
└─md126                  md126           raid1 424.8G
  ├─md126p2              md126p2         md      500M
  ├─md126p3              md126p3         md       86G
  │ ├─vg_system-lv_swap  dm-1            lvm      16G
  │ ├─vg_system-lv_u01   dm-4            lvm     135G
  │ ├─vg_system-lv_root  dm-0            lvm      15G
  │ └─vg_system-lv_home  dm-3            lvm       5G
  ├─md126p1              md126p1         md      500M
  └─md126p4              md126p4         md      100G
    ├─vg_system-lv_u01   dm-4            lvm     135G
    └─vg_system-lv_tmp   dm-5            lvm      15G
sdh                     sdh             disk      1T DellEMC  PowerStore
└─mpathc                 dm-6            mpath     1T
```

The new PowerStore paths are correctly grouped under `mpathc`.

## Verify the Device Mapper UUID

Retrieve the persistent Device Mapper identifiers for the new LUN.

```text
[root@node01 ~]# udevadm info --query=property --name=/dev/mapper/mpathc | egrep 'DM_UUID|DM_NAME'
DM_NAME=mpathc
DM_UUID=mpath-368ccf098009560fdefdb7be1386fcf04
```

The `DM_UUID` will be used to create the persistent ASM device mapping.

## Compare the Existing and Replacement LUN Sizes

Verify that both devices provide the expected capacity.

```text
[root@node01 ~]# blockdev --getsize64 /dev/mapper/mpathb
1099511627776

[root@node01 ~]# blockdev --getsize64 /dev/mapper/mpathc
1099511627776
```

Both LUNs provide `1099511627776` bytes, corresponding to 1 TiB.

## Configure the udev Rule for the New ASM Disk

Create a persistent udev mapping for the new PowerStore LUN.

```text
ACTION=="add|change", ENV{DM_UUID}=="mpath-368ccf098009560fdefdb7be1386fcf04", SYMLINK+="asm-disk3", GROUP="dba", OWNER="oracle", MODE="0660"
```

The resulting udev configuration is:

```text
[root@node01 ~]# cat /etc/udev/rules.d/96-asm.rules
ACTION=="add|change", ENV{DM_UUID}=="mpath-36000144000000010f01ce376b18ad562", SYMLINK+="asm-disk2", GROUP="dba", OWNER="oracle", MODE="0660"
ACTION=="add|change", ENV{DM_UUID}=="mpath-368ccf098009560fdefdb7be1386fcf04", SYMLINK+="asm-disk3", GROUP="dba", OWNER="oracle", MODE="0660"
```

Reload the rules:

```text
[root@node01 ~]# udevadm control --reload-rules
[root@node01 ~]# udevadm trigger --subsystem-match=block --action=change
[root@node01 ~]# udevadm settle
```

Verify the resulting ASM device:

```text
[root@node01 ~]# ls -l /dev/asm-disk3
lrwxrwxrwx 1 root root 4 Jul 15 23:22 /dev/asm-disk3 -> dm-6
```

## Verify the ASM Device Mapping

Verify that the udev ASM device and multipath device resolve to the same Device Mapper device.

```text
[root@node01 ~]# readlink -e /dev/asm-disk3
/dev/dm-6

[root@node01 ~]# readlink -e /dev/mapper/mpathc
/dev/dm-6
```

Both resolve to `/dev/dm-6`.

## Verify the Complete udev Properties

```text
[root@node01 ~]# udevadm info --query=all --name=/dev/asm-disk3
P: /devices/virtual/block/dm-6
N: dm-6
L: 10
S: asm-disk3
S: disk/by-id/dm-name-mpathc
S: disk/by-id/dm-uuid-mpath-368ccf098009560fdefdb7be1386fcf04
S: mapper/mpathc
E: DEVLINKS=/dev/asm-disk3 /dev/disk/by-id/dm-name-mpathc /dev/disk/by-id/dm-uuid-mpath-368ccf098009560fdefdb7be1386fcf04 /dev/mapper/mpathc
E: DEVNAME=/dev/dm-6
E: DEVPATH=/devices/virtual/block/dm-6
E: DEVTYPE=disk
E: DM_NAME=mpathc
E: DM_SUSPENDED=0
E: DM_UDEV_DISABLE_LIBRARY_FALLBACK_FLAG=1
E: DM_UDEV_PRIMARY_SOURCE_FLAG=1
E: DM_UDEV_RULES_VSN=2
E: DM_UUID=mpath-368ccf098009560fdefdb7be1386fcf04
E: MAJOR=252
E: MINOR=6
E: MPATH_SBIN_PATH=/sbin
E: SUBSYSTEM=block
E: TAGS=:systemd:
E: USEC_INITIALIZED=209322658919
```

## Verify Device Ownership and Permissions

```text
[root@node01 ~]# stat /dev/dm-6
  File: /dev/dm-6
  Size: 0               Blocks: 0          IO Block: 4096   block special file
Device: 6h/6d   Inode: 871551737   Links: 1     Device type: fc,6
Access: (0660/brw-rw----)  Uid: (54321/  oracle)   Gid: (54322/     dba)
Access: 2026-07-15 23:22:48.592647467 +0200
Modify: 2026-07-15 23:22:48.592647467 +0200
Change: 2026-07-15 23:22:48.592647467 +0200
 Birth: -
```

The device is owned by `oracle:dba` and has mode `0660`.

## Verify Multipath and udev on the Second Cluster Node

This is an important prerequisite.

Because the environment consists of two active/passive cluster nodes, the replacement LUN must be correctly presented and configured on **both nodes before it is added to the ASM disk group**.

Verify the PowerStore LUN on `node02`:

```text
[root@node02 ~]# multipath -ll
mpathc (368ccf098009560fdefdb7be1386fcf04) dm-6 DellEMC ,PowerStore
size=1.0T features='0' hwhandler='0' wp=rw
|-+- policy='service-time 0' prio=10 status=active
| `- 9:0:2:1  sdc                8:32      active ready running
|-+- policy='service-time 0' prio=10 status=enabled
| `- 9:0:3:1  sdd                8:48      active ready running
|-+- policy='service-time 0' prio=50 status=enabled
| `- 9:0:4:1  sdg                8:96      active ready running
|-+- policy='service-time 0' prio=50 status=enabled
| `- 9:0:5:1  sdh                8:112     active ready running
|-+- policy='service-time 0' prio=10 status=enabled
| `- 9:0:6:1  sdi                8:128     active ready running
|-+- policy='service-time 0' prio=10 status=enabled
| `- 9:0:7:1  sdj                8:144     active ready running
|-+- policy='service-time 0' prio=10 status=enabled
| `- 9:0:8:1  sdk                8:160     active ready running
`-+- policy='service-time 0' prio=10 status=enabled
  `- 9:0:9:1  sdl                8:176     active ready running

mpathb (36000144000000010f01ce376b18ad562) dm-2 EMC     ,Invista
size=1.0T features='1 queue_if_no_path' hwhandler='0' wp=rw
`-+- policy='service-time 0' prio=1 status=active
  |- 10:0:0:0 sde                8:64      active ready running
  `- 10:0:1:0 sdf                8:80      active ready running
```

The same PowerStore WWID must be visible:

```text
368ccf098009560fdefdb7be1386fcf04
```

Verify the Device Mapper information:

```text
[root@node02 ~]# udevadm info --query=property --name=/dev/mapper/mpathc | egrep 'DM_UUID|DM_NAME'
DM_NAME=mpathc
DM_UUID=mpath-368ccf098009560fdefdb7be1386fcf04
```

Verify that the same udev rule is installed on the second node:

```text
[root@node02 ~]# cat /etc/udev/rules.d/96-asm.rules
ACTION=="add|change", ENV{DM_UUID}=="mpath-36000144000000010f01ce376b18ad562", SYMLINK+="asm-disk2", GROUP="dba", OWNER="oracle", MODE="0660"
ACTION=="add|change", ENV{DM_UUID}=="mpath-368ccf098009560fdefdb7be1386fcf04", SYMLINK+="asm-disk3", GROUP="dba", OWNER="oracle", MODE="0660"
```

Reload the udev rules where required:

```text
[root@node02 ~]# udevadm control --reload-rules
[root@node02 ~]# udevadm trigger --subsystem-match=block --action=change
[root@node02 ~]# udevadm settle
```

Verify the ASM device:

```text
[root@node02 ~]# ls -l /dev/asm-disk3
lrwxrwxrwx 1 root root 4 Jul 15 23:22 /dev/asm-disk3 -> dm-6
```

Verify both device names:

```text
[root@node02 ~]# readlink -e /dev/asm-disk3
/dev/dm-6

[root@node02 ~]# readlink -e /dev/mapper/mpathc
/dev/dm-6
```

Verify the complete udev information:

```text
[root@node02 ~]# udevadm info --query=all --name=/dev/asm-disk3
P: /devices/virtual/block/dm-6
N: dm-6
L: 10
S: asm-disk3
S: disk/by-id/dm-name-mpathc
S: disk/by-id/dm-uuid-mpath-368ccf098009560fdefdb7be1386fcf04
S: mapper/mpathc
E: DEVLINKS=/dev/asm-disk3 /dev/disk/by-id/dm-name-mpathc /dev/disk/by-id/dm-uuid-mpath-368ccf098009560fdefdb7be1386fcf04 /dev/mapper/mpathc
E: DEVNAME=/dev/dm-6
E: DEVPATH=/devices/virtual/block/dm-6
E: DEVTYPE=disk
E: DM_NAME=mpathc
E: DM_SUSPENDED=0
E: DM_UDEV_DISABLE_LIBRARY_FALLBACK_FLAG=1
E: DM_UDEV_PRIMARY_SOURCE_FLAG=1
E: DM_UDEV_RULES_VSN=2
E: DM_UUID=mpath-368ccf098009560fdefdb7be1386fcf04
E: MAJOR=252
E: MINOR=6
E: MPATH_SBIN_PATH=/sbin
E: SUBSYSTEM=block
E: TAGS=:systemd:
E: USEC_INITIALIZED=662438186647
```

At this point, the new storage has been verified from both cluster nodes.

> **Do not add the new disk to ASM until the storage checks have succeeded on both nodes.**
>
> Before continuing, verify that:
>
> - `mpathc` is visible on both nodes.
> - Both nodes see WWID `368ccf098009560fdefdb7be1386fcf04`.
> - The udev rule exists on both nodes.
> - `/dev/asm-disk3` exists on both nodes.
> - `/dev/asm-disk3` resolves to the expected multipath device.
> - Device ownership and permissions are correct.
>
> Only after the operating-system storage configuration has been validated on both nodes should the new disk be presented to ASM.

## Verify the New Disk as an ASM Candidate

Connect to the ASM instance:

```text
oracle@node01 // +ASM2 // ~ $ sqlplus / as sysasm
```

Verify the existing ASM disk and the new candidate disk:

```text
SQL> SELECT
  2      NVL(a.name, '[CANDIDATE]') as disk_group_name,
  3      b.path as disk_file_path,
  4      b.name as disk_file_name,
  5      b.failgroup as disk_file_fail_group,
  6      b.mount_status,
  7      b.header_status,
  8      b.state
  9  FROM
 10      v$asm_diskgroup a
 11      RIGHT OUTER JOIN v$asm_disk b ON a.group_number = b.group_number
 12  ORDER BY
 13      disk_group_name, disk_file_path;

DISK_GROUP_NAME DISK_FILE_PATH                                     DISK_FILE_NAME            DISK_FILE_FAIL_ MOUNT_STATUS HEADER_STATU STATE
--------------- -------------------------------------------------- ------------------------- --------------- ------------ ------------ ----------
DATA            /dev/asm-disk2                                     DATA2                     DATA2           CACHED       MEMBER       NORMAL
[CANDIDATE]     /dev/asm-disk3                                                                               CLOSED       CANDIDATE    NORMAL
```

The important state for the replacement disk is:

```text
/dev/asm-disk3
MOUNT_STATUS  = CLOSED
HEADER_STATUS = CANDIDATE
STATE         = NORMAL
```

At this stage, all operating-system and cluster-node checks have been completed and ASM recognizes the new disk as a candidate.

## Add the New Disk to the DATA Disk Group

The new disk can now be added to the existing `DATA` disk group.

```text
SQL> alter diskgroup DATA add disk '/dev/asm-disk3' rebalance power 10;

Diskgroup altered.
```

The disk group remains mounted while ASM begins redistributing extents to the new storage.

This is the key mechanism that makes the migration an **online storage migration**: the existing ACFS file systems remain mounted while ASM performs the storage redistribution underneath them.

## Monitor the Online ASM Rebalance

Monitor the operation using `V$ASM_OPERATION`.

```text
SQL> select * from v$asm_operation;

GROUP_NUMBER OPERA PASS      STATE           POWER     ACTUAL      SOFAR   EST_WORK   EST_RATE EST_MINUTES ERROR_CODE                                       CON_ID
------------ ----- --------- ---------- ---------- ---------- ---------- ---------- ---------- ----------- -------------------------------------------- ----------
           1 REBAL COMPACT   RUN                10         10      41400     114657       7875          10                                                       0
           1 REBAL REBALANCE DONE               10         10      28348      28348          0           0                                                       0
           1 REBAL REBUILD   DONE               10         10          0          0          0           0                                                       0
```

The live production workload continued while ASM performed the rebalance.

## Verify Data Distribution Across Both ASM Disks

After the add operation and rebalance, verify the data distribution.

```text
SQL> SET LINES 220
SQL> COL NAME FORMAT A15
SQL> COL PATH FORMAT A35

SQL> SELECT name,
  2         path,
  3         total_mb,
  4         free_mb,
  5         total_mb - free_mb AS used_mb
  6  FROM v$asm_disk
  7  WHERE group_number = (
  8      SELECT group_number
  9      FROM v$asm_diskgroup
 10      WHERE name = 'DATA'
 11  )
 12  ORDER BY path;

NAME            PATH                                  TOTAL_MB    FREE_MB    USED_MB
--------------- ----------------------------------- ---------- ---------- ----------
DATA2           /dev/asm-disk2                         1048576     589856     458720
DATA_0000       /dev/asm-disk3                         1048576     589932     458644
```

The used space is now distributed almost evenly across the old and new ASM disks.

This is an important verification point before removing the old storage.

## Verify the Temporary DATA Disk Group Capacity

Because both 1 TiB disks are currently members of the disk group, `DATA` temporarily has approximately 2 TiB of raw capacity.

```text
SQL> SELECT
  2      name                                     group_name,
  3      sector_size                              sector_size,
  4      block_size                               block_size,
  5      allocation_unit_size                     allocation_unit_size,
  6      state                                    state,
  7      type                                     type,
  8      total_mb                                 total_mb,
  9      (total_mb - free_mb)                     used_mb,
 10      ROUND((1- (free_mb / total_mb))*100, 2)  pct_used
 11  FROM
 12      v$asm_diskgroup
 13  ORDER BY
 14      name;

Disk Group            Sector   Block   Allocation
Name                    Size    Size    Unit Size State       Type   Total Size (MB) Used Size (MB) Pct. Used
-------------------- ------- ------- ------------ ----------- ------ --------------- -------------- ---------
DATA                     512   4,096    4,194,304 MOUNTED     EXTERN       2,097,152        917,364     43.74
                                                                         --------------- --------------
Grand Total:                                                               2,097,152        917,364
```

`asmcmd lsdg` also reflects the temporary increase:

```text
oracle@node01 // +ASM2 // ~ $ asmcmd lsdg
State    Type    Rebal  Sector  Logical_Sector  Block       AU  Total_MB  Free_MB  Req_mir_free_MB  Usable_file_MB  Offline_disks  Voting_files  Name
MOUNTED  EXTERN  N         512             512   4096  4194304   2097152  1179788                0         1179788              0             Y  DATA/
```

This temporary increase is expected while both storage devices belong to the same ASM disk group.

## Verify Both ASM Disks Before Dropping the Old Disk

Verify the state of both ASM disks.

```text
SQL> SELECT name,
  2         path,
  3         state,
  4         mode_status,
  5         mount_status,
  6         header_status
  7  FROM v$asm_disk
  8  WHERE group_number = (
  9      SELECT group_number
 10      FROM v$asm_diskgroup
 11      WHERE name='DATA'
 12  );

NAME            PATH                                STATE    MODE_ST MOUNT_S HEADER_STATU
--------------- ----------------------------------- -------- ------- ------- ------------
DATA2           /dev/asm-disk2                      NORMAL   ONLINE  CACHED  MEMBER
DATA_0000       /dev/asm-disk3                      NORMAL   ONLINE  CACHED  MEMBER
```

At this stage:

```text
Old storage:
  ASM disk name: DATA2
  Device:        /dev/asm-disk2

New storage:
  ASM disk name: DATA_0000
  Device:        /dev/asm-disk3
```

Both devices are valid, online ASM members.

## Drop the Old ASM Disk

The old ASM disk can now be removed.

ASM uses the **ASM disk name** for the `DROP DISK` operation.

The old disk is `DATA2`.

```text
SQL> ALTER DISKGROUP DATA DROP DISK DATA2 REBALANCE POWER 8;

Diskgroup altered.
```

ASM now performs another online rebalance and relocates the remaining extents from `DATA2` to `DATA_0000`.

The ACFS file systems remain mounted while the storage relocation takes place.

## Monitor the Final Online Rebalance

Monitor the drop operation using ASMCMD.

```text
oracle@node01 // +ASM2 // trace $ asmcmd lsop
Group_Name  Pass       State  Power  EST_WORK  EST_RATE  EST_TIME
DATA        COMPACT    WAIT   8      0         0         0
DATA        REBUILD    DONE   8      0         0         0
DATA        REBALANCE  RUN    8      114670    0         0
```

Continue monitoring the operation.

After completion:

```text
oracle@node01 // +ASM2 // trace $ asmcmd lsop
Group_Name  Pass       State  Power  EST_WORK  EST_RATE  EST_TIME
```

No active ASM operation remains.

> **Important:** Do not remove, unpresent, or reuse the old SAN LUN while the ASM disk drop is still in progress. Wait until the ASM operation has completed and verify that the old disk is no longer a member of the disk group.


## Verify the Final ASM Disk Configuration

Reconnect to ASM after the rebalance.

```text
oracle@node01 // +ASM2 // trace $ sqlplus / as sysasm

SQL*Plus: Release 19.0.0.0.0 - Production
Version 19.30.0.0.0

Connected to:
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
Version 19.30.0.0.0
```

Verify the remaining ASM disk:

```text
SQL> SELECT name,
       path,
       state,
       mode_status,
       mount_status,
       header_status
FROM v$asm_disk
WHERE group_number = (
    SELECT group_number
    FROM v$asm_diskgroup
    WHERE name='DATA'
);

NAME            PATH                       STATE      MODE_STATUS  MOUNT_STATUS  HEADER_STATUS
--------------- -------------------------- ---------- ------------ ------------- -------------
DATA_0000       /dev/asm-disk3             NORMAL     ONLINE       CACHED        MEMBER
```

The PowerStore-backed `/dev/asm-disk3` device is now the only ASM disk in the `DATA` disk group.

## Remove the Old udev Rule

After confirming that the old ASM disk has been successfully removed from the `DATA` disk group and the rebalance has completed, the udev rule associated with the old storage can be commented out or removed from **both cluster nodes**.

```text
#ACTION=="add|change", ENV{DM_UUID}=="mpath-36000144000000010f01ce376b18ad562", SYMLINK+="asm-disk2", GROUP="dba", OWNER="oracle", MODE="0660"
```

> **Important:** Remove or comment out the old udev rule only after confirming that `/dev/asm-disk2` is no longer a member of the ASM disk group.



## Verify the Final ASM Disk Utilization

```text
SQL> SET LINES 220
SQL> COL NAME FORMAT A15
SQL> COL PATH FORMAT A35

SQL> SELECT name,
       path,
       total_mb,
       free_mb,
       total_mb - free_mb AS used_mb
FROM v$asm_disk
WHERE group_number = (
    SELECT group_number
    FROM v$asm_diskgroup
    WHERE name = 'DATA'
)
ORDER BY path;

NAME            PATH                                  TOTAL_MB    FREE_MB    USED_MB
--------------- ----------------------------------- ---------- ---------- ----------
DATA_0000       /dev/asm-disk3                         1048576     131224     917352
```

All allocated ASM data is now located on the replacement storage.

## Verify the DATA Disk Group After Migration

Verify the final disk group configuration:

```text
oracle@node02 // +ASM1 // ~ $ asmcmd lsdg
State    Type    Rebal  Sector  Logical_Sector  Block       AU  Total_MB  Free_MB  Req_mir_free_MB  Usable_file_MB  Offline_disks  Voting_files  Name
MOUNTED  EXTERN  N         512             512   4096  4194304   1048576   131228                0          131228              0             Y  DATA/
```

The disk group has returned to its original 1 TiB capacity.

The ASM disk group itself was not recreated. The physical storage backing it was replaced online.

## Verify the ADVM Volumes After Migration

Verify all ADVM volumes again:

```text
oracle@node02 // +ASM1 // ~ $ asmcmd volinfo --all
Diskgroup Name: DATA

         Volume Name: DATA02
         Volume Device: /dev/asm/data02-88
         State: ENABLED
         Size (MB): 256000
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u02/app/oracle/oradata

         Volume Name: DATA04
         Volume Device: /dev/asm/data04-88
         State: ENABLED
         Size (MB): 256000
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u04/app/oracle/oradata

         Volume Name: DPDUMP03
         Volume Device: /dev/asm/dpdump03-88
         State: ENABLED
         Size (MB): 102400
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u03/app/oracle/dpdump

         Volume Name: FRA02
         Volume Device: /dev/asm/fra02-88
         State: ENABLED
         Size (MB): 102400
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u02/app/oracle/fast_recovery_area

         Volume Name: FRA04
         Volume Device: /dev/asm/fra04-88
         State: ENABLED
         Size (MB): 102400
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u04/app/oracle/fast_recovery_area

         Volume Name: ols
         Volume Device: /dev/asm/ols-88
         State: ENABLED
         Size (MB): 51200
         Resize Unit (MB): 64
         Redundancy: UNPROT
         Stripe Columns: 8
         Stripe Width (K): 1024
         Usage: ACFS
         Mountpath: /u03/app/ols_old
```

All six ADVM volumes remain enabled.

Their device names and mount points remain unchanged.

## Verify the Complete ACFS Configuration After Migration

Perform a final `acfsutil info fs` verification.

```text
oracle@node02 // +ASM1 // ~ $ acfsutil info fs
/u02/app/oracle/fast_recovery_area
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Feb  3 16:44:25 2020
    mount time:      Wed Mar 18 17:17:34 2026
    mount sequence number: 0
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   107374182400  ( 100.00 GB )
    total free:   74114981888  (  69.02 GB )
    file entry table allocation: 25559040
    primary volume: /dev/asm/fra02-88
        label:
        state:                 Available
        major, minor:          250, 45057
        logical sector size:   512
        size:                  107374182400  ( 100.00 GB )
        free:                  74114981888  (  69.02 GB )
        metadata read I/O count:         495646
        metadata write I/O count:        619479
        total metadata bytes read:       2684014592  (   2.50 GB )
        total metadata bytes written:    3279065088  (   3.05 GB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u02/app/oracle/oradata
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Feb  3 16:43:54 2020
    mount time:      Wed Mar 18 17:17:34 2026
    mount sequence number: 1
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   268435456000  ( 250.00 GB )
    total free:   53886533632  (  50.19 GB )
    file entry table allocation: 17170432
    primary volume: /dev/asm/data02-88
        label:
        state:                 Available
        major, minor:          250, 45058
        logical sector size:   512
        size:                  268435456000  ( 250.00 GB )
        free:                  53886533632  (  50.19 GB )
        metadata read I/O count:         797750
        metadata write I/O count:        1160833
        total metadata bytes read:       4168642560  (   3.88 GB )
        total metadata bytes written:    5903491072  (   5.50 GB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u03/app/oracle/dpdump
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Feb 10 15:14:20 2020
    mount time:      Wed Mar 18 17:17:34 2026
    mount sequence number: 2
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   107374182400  ( 100.00 GB )
    total free:   86482481152  (  80.54 GB )
    file entry table allocation: 393216
    primary volume: /dev/asm/dpdump03-88
        label:
        state:                 Available
        major, minor:          250, 45059
        logical sector size:   512
        size:                  107374182400  ( 100.00 GB )
        free:                  86482481152  (  80.54 GB )
        metadata read I/O count:         337390
        metadata write I/O count:        10
        total metadata bytes read:       1381949440  (   1.29 GB )
        total metadata bytes written:    40960  (  40.00 KB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u04/app/oracle/oradata
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Fri Jul  3 16:10:28 2020
    mount time:      Wed Mar 18 17:17:34 2026
    mount sequence number: 3
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   268435456000  ( 250.00 GB )
    total free:   54544441344  (  50.80 GB )
    file entry table allocation: 17170432
    primary volume: /dev/asm/data04-88
        label:
        state:                 Available
        major, minor:          250, 45061
        logical sector size:   512
        size:                  268435456000  ( 250.00 GB )
        free:                  54544441344  (  50.80 GB )
        metadata read I/O count:         791883
        metadata write I/O count:        2358963
        total metadata bytes read:       6009851904  (   5.60 GB )
        total metadata bytes written:    13408141312  (  12.49 GB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u03/app/ols_old
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Mon Mar  9 13:03:08 2020
    mount time:      Wed Mar 18 17:17:34 2026
    mount sequence number: 4
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   53687091200  (  50.00 GB )
    total free:   52379095040  (  48.78 GB )
    file entry table allocation: 721813504
    primary volume: /dev/asm/ols-88
        label:
        state:                 Available
        major, minor:          250, 45060
        logical sector size:   512
        size:                  53687091200  (  50.00 GB )
        free:                  52379095040  (  48.78 GB )
        metadata read I/O count:         337386
        metadata write I/O count:        10
        total metadata bytes read:       1381933056  (   1.29 GB )
        total metadata bytes written:    40960  (  40.00 KB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED

/u04/app/oracle/fast_recovery_area
    ACFS Version: 19.0.0.0.0
    on-disk version:       49.0
    compatible.advm:       19.0.0.0.0
    ACFS compatibility:    19.0.0.0.0
    flags:        MountPoint,Available,KiloSnap
    creation time:   Fri Jul  3 16:10:17 2020
    mount time:      Wed Mar 18 17:17:34 2026
    mount sequence number: 5
    number of nodes:       2
    allocation unit:       4096
    metadata block size:   4096
    volumes:      1
    total size:   107374182400  ( 100.00 GB )
    total free:   37180796928  (  34.63 GB )
    file entry table allocation: 33947648
    primary volume: /dev/asm/fra04-88
        label:
        state:                 Available
        major, minor:          250, 45062
        logical sector size:   512
        size:                  107374182400  ( 100.00 GB )
        free:                  37180796928  (  34.63 GB )
        metadata read I/O count:         594078
        metadata write I/O count:        1061977
        total metadata bytes read:       4297240576  (   4.00 GB )
        total metadata bytes written:    6472261632  (   6.03 GB )
        ADVM diskgroup:        DATA
        ADVM resize increment: 67108864
        ADVM redundancy:       unprotected
        ADVM stripe columns:   8
        ADVM stripe width:     1048576
    number of snapshots:  0
    snapshot space usage: 0  ( 0.00 )
    replication status: DISABLED
    compression status: DISABLED
```

All six ACFS file systems remain available after the migration.

The ADVM disk group remains `DATA`, and the existing ADVM volume devices and ACFS mount points remain unchanged.

## Migration Result

Before the migration:

```text
          EMC Invista SAN
                 │
               mpathb
                 │
         /dev/asm-disk2
                 │
        ┌────────▼────────┐
        │ ASM Disk Group  │
        │      DATA       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  ADVM Volumes   │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │      ACFS       │
        │  File Systems   │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Live Production │
        │    Workload     │
        └─────────────────┘
```

During the online migration:

```text

 Old SAN                              New SAN
EMC Invista                        PowerStore
   1 TiB                              1 TiB
    │                                  ▲
  mpathb                             mpathc
    │                                  ▲
asm-disk2 ─────── ASM DATA ───────► asm-disk3
                       │
                Online Rebalance
                       │
              DATA temporarily 2 TiB
                       │
                  ADVM Volumes
                       │
                     ACFS
                       │
               Live Production
```

After the migration:

```text
       Dell EMC PowerStore
                 │
               mpathc
                 │
         /dev/asm-disk3
                 │
        ┌────────▼────────┐
        │ ASM Disk Group  │
        │      DATA       │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │  ADVM Volumes   │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │      ACFS       │
        │  File Systems   │
        └────────┬────────┘
                 │
        ┌────────▼────────┐
        │ Live Production │
        │    Workload     │
        └─────────────────┘
```

The physical storage was replaced while the logical ASM, ADVM, and ACFS layers remained in place.

The ACFS file systems remained mounted and the live production workload continued during the ASM storage migration.

## Summary

The underlying storage for the Oracle ACFS environment was migrated from **EMC Invista to Dell EMC PowerStore** using Oracle ASM rebalance.

The replacement LUN was presented and configured on both nodes of the active/passive cluster before being added to the existing `DATA` disk group. ASM then redistributed the allocated extents to the new storage, after which the old ASM disk was removed.

The existing **ADVM volumes, ACFS file systems, and mount points remained unchanged** throughout the process. This allowed the storage migration to be completed **online without disrupting the live production workload**.
