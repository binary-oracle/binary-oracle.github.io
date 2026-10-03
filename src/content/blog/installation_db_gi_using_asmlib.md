---
title: "Installing Oracle Database 19c and Grid Infrastructure with ASMLIB v3 and the Latest Release Update"
description: "Step-by-step guide to installing Oracle Grid Infrastructure 19c and Oracle Database 19c on Linux using Oracle ASMLIB v3, including patching both Oracle homes to the latest available 19c Release Update."
pubDate: 2026-10-03
tags:
  - Oracle
  - Oracle Database 19c
  - Oracle Grid Infrastructure 19c
  - Oracle ASM
  - Oracle ASMLIB
  - ASMLIB v3
  - Release Update
  - Patching
  - Oracle Linux
  - Linux
---

## Hardware Prerequisites

Before installing Oracle Grid Infrastructure 19c and Oracle Database 19c, verify that the server meets the required hardware and storage requirements.

The following components should be available before beginning the installation:

| Component | Requirement |
| --- | --- |
| CPU Architecture | x86-64 |
| Physical Memory | Minimum 8 GB RAM |
| Swap Space | Based on installed physical memory |
| `/tmp` | Minimum 1 GB free space |
| Oracle Software Storage | Sufficient local storage for Grid Infrastructure, Database home, and Release Updates |
| Network | At least one configured network interface |
| SAN Storage | Block devices/LUNs presented to the server for Oracle ASM |
| ASM Storage | Dedicated block devices for ASM disk groups |
| ASMLIB | Oracle ASMLIB v3 |

### Memory and Swap

Oracle Grid Infrastructure requires at least **8 GB of physical memory**.

For systems with up to 16 GB of RAM, configure swap space equal to the amount of RAM. For systems with more than 16 GB of RAM, Oracle requires at least 16 GB of swap space.

For example:

| Physical Memory | Swap Space |
| ---: | ---: |
| 8 GB | 8 GB |
| 16 GB | 16 GB |
| 32 GB | 16 GB |
| 64 GB | 16 GB |

### Oracle ASMLIB v3 Prerequisites

Before installing Oracle ASMLIB v3, verify that the operating system, kernel, Oracle Database software, and storage configuration meet the required prerequisites.

| Component | Requirement |
| --- | --- |
| Operating System | Oracle Linux 8 or later |
| Oracle ASMLIB | `oracleasmlib-3.0.0` or later |
| ASMLIB Support Tools | `oracleasm-support-3.0.0` or later |
| Oracle Database 19c | **RU 19.21 with the required patch, or later** |
| Kernel | UEK R7 or later does not require a separate ASMLIB driver |
| Storage | Block devices presented and visible to the operating system |
| Multipathing | Device Mapper Multipath configured before ASMLIB when SAN multipathing is used |

> **Important**
>
> Oracle Database 19c support for Oracle ASMLIB requires **Oracle Database 19c Release Update 19.21 with the required patch, or later**. This guide patches Oracle Grid Infrastructure and Oracle Database to the latest available 19c Release Update.

All Oracle ASMLIB installations require the `oracleasmlib` and `oracleasm-support` packages. The `oracleasm-support` package is available from the [Unbreakable Linux Network](https://linux.oracle.com/) (ULN) or the [Oracle Linux Yum Server](https://yum.oracle.com/).

The ASM block devices must be presented and visible to the operating system before they are configured with ASMLIB. When SAN storage uses multiple paths, configure and verify Device Mapper Multipath before creating ASMLIB disk labels.

For additional information, see [Oracle ASMLIB](https://www.oracle.com/linux/technologies/asmlib/).

## Required Software

| Component | File Name / Patch Name |
| --- | --- |
| Oracle Grid Infrastructure 19c (19.3) | `LINUX.X64_193000_grid_home.zip` |
| Oracle Database 19c (19.3) | `LINUX.X64_193000_db_home.zip` |
| OJVM + GI Patch (19.32) | `p39618711_190000_Linux-x86-64.zip` |
| OPatch | **Patch 6880880** — `p6880880_190000_Linux-x86-64.zip` |
| Oracle ASMLIB v3 | `oracleasmlib-3.1.3-1.el9.x86_64.rpm` |
| Oracle ASMLIB Support Tools | `oracleasm-support` |

> **Note**
>
> The **OJVM + GI patch bundle** includes the Oracle Grid Infrastructure Release Update (GI RU), Oracle Database Release Update (DB RU), and the corresponding Oracle JavaVM (OJVM) Release Update. Therefore, a separate Database RU download is not required.
>
> This bundle provides the required Grid Infrastructure, Database, and OJVM patches for the selected 19c Release Update level.
>
> Always verify the required OPatch version and patch prerequisites in the README supplied with the selected Release Update before applying the patch.

### Configure Host Name Resolution

Configure the `/etc/hosts` file to ensure that the server hostname resolves to the correct IP address. Proper hostname resolution is required before installing Oracle Grid Infrastructure.

Add the host IP address and hostname:

```bash
[root@binary ~]# hostname -i
192.168.0.239
[root@binary ~]# sed -i '$a192.168.56.30 binary' /etc/hosts
```

Verify the configuration:

```bash"
[root@binary ~]# cat /etc/hosts
127.0.0.1   localhost localhost.localdomain localhost4 localhost4.localdomain4
::1         localhost localhost.localdomain localhost6 localhost6.localdomain6
192.168.56.30 binary
```

### Update the Operating System

Update all installed packages to the latest versions available from the configured repositories:

```bash"
[root@binary ~]# dnf update -y
```

### Install Required Packages

Install the Oracle Database 19c preinstallation RPM together with the additional system administration utilities used in this guide:

```bash"
[root@binary ~]# dnf install -y oracle-database-preinstall-19c tigervnc-server wget bind-utils xterm tmux git rsync iotop strace mlocate nfs-utils perl-core lynx
```

The `oracle-database-preinstall-19c` package installs the required operating system packages and configures many of the kernel parameters and resource limits required for Oracle Database 19c.


### Reboot the Server

After completing the operating system update and package installation, reboot the server to ensure that any kernel and system updates are active:

```
[root@binary ~]# reboot
```


### Create the Oracle Software Directories

Create the Oracle Grid Infrastructure and Oracle Database home directories using the Oracle Optimal Flexible Architecture (OFA) directory structure.

The following directory layout will be used:

| Directory | Purpose |
| --- | --- |
| `/u01/app/19.0.0/grid` | Oracle Grid Infrastructure home |
| `/u01/app/oracle/product/19.0.0/dbhome_1` | Oracle Database home |
| `/u01/staging/software` | Oracle installation media |
| `/u01/staging/patches` | Oracle patches and OPatch |

Create the required directories:

```bash"
[root@binary ~]# mkdir -p /u01/app/19.0.0/grid
[root@binary ~]# mkdir -p /u01/app/oracle/product/19.0.0/dbhome_1
[root@binary ~]# mkdir -p /u01/staging/{software,patches}
```

In this configuration, the `oracle` operating system user is used as the software owner for both Oracle Grid Infrastructure and Oracle Database.

Set the ownership and permissions for the `/u01` directory structure:

```bash
[root@binary ~]# chown -R oracle:oinstall /u01
```

The resulting directory structure is:

```text id="cz8k79"
/u01
├── app
│   ├── 19.0.0
│   │   └── grid
│   └── oracle
│       └── product
│           └── 19.0.0
│               └── dbhome_1
└── staging
    ├── software
    └── patches
```

> **Note**
>
> This guide uses the same `oracle` operating system user to install and own both Oracle Grid Infrastructure and Oracle Database software. Oracle also supports role-separated configurations where a dedicated `grid` user owns the Grid Infrastructure software and the `oracle` user owns the Oracle Database software.

### Filesystem Layout

The server uses dedicated logical volumes for the operating system and Oracle software. The `/u01` filesystem is reserved for the Oracle Grid Infrastructure home, Oracle Database home, and software staging area.

```bash id="iy8l9h"
[root@binary ~]# df -h
Filesystem                     Size  Used Avail Use% Mounted on
devtmpfs                       4.0M     0  4.0M   0% /dev
tmpfs                          5.9G     0  5.9G   0% /dev/shm
tmpfs                          2.4G  8.6M  2.4G   1% /run
/dev/mapper/vg_system-lv_root   15G  3.1G   11G  22% /
/dev/sda1                      974M  524M  383M  58% /boot
/dev/mapper/vg_system-lv_home  4.9G   44K  4.6G   1% /home
/dev/mapper/vg_system-lv_tmp   4.9G   80K  4.6G   1% /tmp
/dev/mapper/vg_system-lv_u01   118G  8.5G  104G   8% /u01
tmpfs                          1.2G     0  1.2G   0% /run/user/54321
```

The `/u01` filesystem provides **118 GB** of local storage and is used for:

- Oracle Grid Infrastructure 19c
- Oracle Database 19c
- Installation media
- Release Updates and other patches

Oracle ASM storage is provided separately using dedicated block devices and is not included in the `/u01` filesystem.

### Set the Oracle User Password

The `oracle-database-preinstall-19c` package creates the `oracle` operating system user. Set a password for the account before transferring the installation files:

```"
[root@binary ~]# passwd oracle
Changing password for user oracle.
New password: 
Retype new password: 
passwd: all authentication tokens updated successfully.
```

Verify the `oracle` user and its group memberships:

```bash"
[root@binary ~]# id oracle
uid=54321(oracle) gid=54321(oinstall) groups=54321(oinstall),54322(dba),54323(oper),54324(backupdba),54325(dgdba),54326(kmdba),54330(racdba)

```

### Transfer and Verify the Staged Files

Transfer the Oracle installation media to `/u01/staging/software` and the required patches to `/u01/staging/patches`.

```bash
honey7@fedora:~/Downloads$ scp LINUX.X64_193000_* oracle@192.168.56.30:/u01/staging/software
oracle@192.168.56.30's password: 
LINUX.X64_193000_db_home.zip                        100% 2918MB 459.8MB/s   00:06    
LINUX.X64_193000_grid_home.zip                      100% 2755MB 314.6MB/s   00:08

honey7@fedora:~/Downloads$ scp oracleasmlib-3.1.3-1.el9.x86_64.rpm oracle@192.168.56.30:/u01/staging/software
oracle@192.168.56.30's password: 
oracleasmlib-3.1.3-1.el9.x86_64.rpm                 100%   53KB  41.6MB/s   00:00   
```

```bash
honey7@fedora:~/Downloads$ scp p[1-9]* oracle@192.168.56.30:/u01/staging/patches
oracle@192.168.56.30's password: 
p39618711_190000_Linux-x86-64.zip                   100% 2881MB 444.2MB/s   00:06    
p6880880_190000_Linux-x86-64.zip                    100%  130MB 290.1MB/s   00:00    
```

After the transfer completes, connect to the server as `oracle` and verify the files:

```
[oracle@binary ~]$ ls -lh /u01/staging/software
total 5.6G
-rw-r--r--. 1 oracle oinstall 2.9G Oct  3 13:04 LINUX.X64_193000_db_home.zip
-rw-r--r--. 1 oracle oinstall 2.7G Oct  3 13:05 LINUX.X64_193000_grid_home.zip
-rw-r--r--. 1 oracle oinstall  54K Oct  3 13:22 oracleasmlib-3.1.3-1.el9.x86_64.rpm

[oracle@binary ~]$ ls -lh /u01/staging/patches
total 3.0G
-rw-r--r--. 1 oracle oinstall 2.9G Oct  3 13:07 p39618711_190000_Linux-x86-64.zip
-rw-r--r--. 1 oracle oinstall 131M Oct  3 13:07 p6880880_190000_Linux-x86-64.zip
```

The staging area should contain the required installation media and patches before proceeding with the Oracle ASMLIB and Oracle Grid Infrastructure configuration.

## Configure Oracle ASM Storage

### Identify the ASM Disks

Before configuring Oracle ASMLIB, identify the block devices that will be used by Oracle ASM and verify that they are not currently in use.

List the available block devices:

```bash
[root@binary ~]# lsblk
NAME                  MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sda                     8:0    0  200G  0 disk
├─sda1                  8:1    0    1G  0 part /boot
└─sda2                  8:2    0  199G  0 part
  ├─vg_system-lv_root 252:0    0   15G  0 lvm  /
  ├─vg_system-lv_swap 252:1    0   10G  0 lvm  [SWAP]
  ├─vg_system-lv_home 252:2    0    5G  0 lvm  /home
  ├─vg_system-lv_u01  252:3    0  120G  0 lvm  /u01
  └─vg_system-lv_tmp  252:4    0    5G  0 lvm  /tmp
sdb                     8:16   0  100G  0 disk
sdc                     8:32   0   50G  0 disk
sr0                    11:0    1 1024M  1 rom
```

The operating system is installed on `/dev/sda`. Two additional block devices are available and will be dedicated to Oracle ASM:

| Device | Size | ASM Disk Group | Purpose |
| --- | ---: | --- | --- |
| `/dev/sdb` | 100 GB | `DATA` | Oracle database files |
| `/dev/sdc` | 50 GB | `RECO` | Fast Recovery Area and recovery-related files |

The `DATA` disk group will contain the primary database files, while the `RECO` disk group will be used for the Fast Recovery Area.

> **Important**
>
> Verify that `/dev/sdb` and `/dev/sdc` are the correct devices and do not contain data that must be preserved before continuing. The following storage preparation steps modify the disk partition tables.

### Create the ASM Disk Partitions

Create a single partition on each disk that uses the available disk capacity.

Create the partition on `/dev/sdb` and `/dev/sdc`.

```bash
[root@binary ~]# parted /dev/sdc
GNU Parted 3.5
Using /dev/sdc
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted) mklabel msdos                                                    
(parted) mkpart primary 0% 100%                                           
(parted) quit                                                             
Information: You may need to update /etc/fstab.

[root@binary ~]# parted /dev/sdb
GNU Parted 3.5
Using /dev/sdb
Welcome to GNU Parted! Type 'help' to view a list of commands.
(parted) mklabel msdos                                                    
(parted) mkpart primary 0% 100%                                           
(parted) quit                                                             
Information: You may need to update /etc/fstab.

```

Verify both ASM devices:

```bash"
[root@binary ~]# lsblk /dev/sdb /dev/sdc
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sdb      8:16   0  100G  0 disk
└─sdb1   8:17   0  100G  0 part
sdc      8:32   0   50G  0 disk
└─sdc1   8:33   0   50G  0 part
```

The ASM candidate devices are now:

```
/dev/sdb1  -> DATA
/dev/sdc1  -> RECO
```

Do not create filesystems on these partitions. They will be configured as Oracle ASM disks using Oracle ASMLIB v3 in the next step.

### Install Oracle ASMLIB v3.1

Oracle ASMLIB consists of two required packages:

- `oracleasm-support` — provides the ASMLIB administration utilities and service.
- `oracleasmlib` — provides the Oracle ASMLIB userspace library.

On Oracle Linux 9, the `oracleasm-support` package is available from the Oracle Linux Addons repository. The `oracleasmlib` package can be downloaded separately and installed as an RPM.

> **Note**
>
> When using UEK R7 or later, a separate ASMLIB kernel driver is not required.

#### Enable the Oracle Linux Addons Repository

Verify the status of the Oracle Linux 9 Addons repository:

```bash
[root@binary ~]# dnf repolist all | grep -i addons
ol9_addons    Oracle Linux 9 Addons (x86_64)    disabled
```

Enable the repository:

```bash
[root@binary ~]# dnf config-manager --enable ol9_addons
```

Refresh the repository metadata:

```bash
[root@binary ~]# dnf clean all
[root@binary ~]# dnf makecache
```

Verify that the `oracleasm-support` package is available:

```bash
[root@binary ~]# dnf list oracleasm-support
Available Packages
oracleasm-support.x86_64    3.1.1-6.el9    ol9_addons
```

#### Install Oracle ASMLIB Support Tools

Install the `oracleasm-support` package:

```bash
[root@binary ~]# dnf install -y oracleasm-support
```

For this installation, Oracle Linux installs:

```text
oracleasm-support-3.1.1-6.el9.x86_64
```

The installation also enables the `oracleasm.service` systemd service.

#### Install the Oracle ASMLIB Library

The Oracle ASMLIB v3 library RPM was downloaded earlier and transferred to `/u01/staging/software`.

Change to the software staging directory:

```bash
[root@binary ~]# cd /u01/staging/software
```

Install the Oracle ASMLIB v3.1 library:

```bash
[root@binary software]# dnf install -y oracleasmlib-3.1.3-1.el9.x86_64.rpm
```

For this installation, the following version is installed:

```text
oracleasmlib-3.1.3-1.el9.x86_64
```

#### Verify the Installation

Verify that both required ASMLIB packages are installed:

```bash
[root@binary ~]# rpm -q oracleasm-support oracleasmlib
oracleasm-support-3.1.1-6.el9.x86_64
oracleasmlib-3.1.3-1.el9.x86_64
```

At this point, the Oracle ASMLIB v3.1 software is installed and ready to be configured.

### Configure Oracle ASMLIB v3.1

After installing the required ASMLIB packages, initialize and configure the Oracle ASM system service.

Start and enable the `oracleasm` service:

```bash
[root@binary ~]# systemctl start oracleasm
[root@binary ~]# systemctl enable oracleasm
```

Initialize Oracle ASMLIB:

```bash
[root@binary ~]# oracleasm init
Mounting oracleasm driver filesystem: Not applicable with UEK8
Reloading disk partitions: done
Cleaning any stale ASM disks...
Setting up iofilter map for ASM disks: done
Scanning system for ASM disks...
Disk scan successful
```

On UEK8, a separate ASMLIB kernel driver filesystem is not required.

Configure the Oracle ASM system service:

```bash
[root@binary software]# oracleasm configure -i
Configuring the Oracle ASM system service.

This will configure the on-boot properties of the Oracle ASM system
service.  The following questions will determine whether the service
is started on boot and what permissions it will have.  The current
values will be shown in brackets ('[]').  Hitting <ENTER> without
typing an answer will keep that current value.  Ctrl-C will abort.

Default user to own the ASM disk devices []: oracle
Default group to own the ASM disk devices []: oinstall
Start Oracle ASM system service on boot (y/n) [y]:  <<< ENTER
Scan for Oracle ASM disks when starting the oracleasm service (y/n) [y]: <<< ENTER
Maximum number of ASM disks that can be used on system [2048]:  <<< ENTER
Enable iofilter if kernel supports it (y/n) [y]: <<< ENTER
Writing Oracle ASM system service configuration: done

Configuration changes only come into effect after the Oracle ASM
system service is restarted.  Please run 'systemctl restart oracleasm'
after making changes.

WARNING: All of your Oracle and ASM instances must be stopped prior
to restarting the oracleasm service.

```

The resulting configuration uses:

```bash
[root@binary software]# oracleasm status
Checking if the oracleasm kernel module is loaded: no (not required with UEK8)
Checking if /dev/oracleasm is mounted: no (not required with UEK8)
Checking which I/O Interface is in use: io_uring (KABI_V3)
Checking if ASMLIB can be loaded: yes
Checking if io_uring is enabled: yes
Checking if io_uring is accessible to the configured DB user: yes
Checking if io_uring supports integrity passthrough: yes
Checking if ASM disks have the correct ownership and permissions: yes
Checking if ASM I/O filter is set up: yes
```

### ASM Disk Labeling

Label the previously created disk partitions with Oracle ASMLIB to prepare them for use with Oracle ASM.

Create the `DATA01` ASM disk using `/dev/sdb1`:

```bash
[root@binary ~]# oracleasm createdisk DATA01 /dev/sdb1
Writing disk header: done
Instantiating disk: done
```

Create the `RECO01` ASM disk using `/dev/sdc1`:

```bash
[root@binary ~]# oracleasm createdisk RECO01 /dev/sdc1
Writing disk header: done
Instantiating disk: done
```

List the available ASMLIB disks:

```bash
[root@binary ~]# oracleasm listdisks
DATA01
RECO01
```

The ASM disks are now labeled as follows:

| ASMLIB Label | Device | Size | Intended Disk Group |
| --- | --- | ---: | --- |
| `DATA01` | `/dev/sdb1` | 100 GB | `DATA` |
| `RECO01` | `/dev/sdc1` | 50 GB | `RECO` |

Verify each disk label:

```bash
[root@binary software]# oracleasm querydisk DATA01
Disk "DATA01" is a valid ASM disk
[root@binary software]# oracleasm querydisk RECO01
Disk "RECO01" is a valid ASM disk
```

The ASMLIB disks are now ready to be selected during the Oracle Grid Infrastructure installation.

## Grid Infrastructure Installation and Configuration

With the operating system, ASM storage, and Oracle ASMLIB configuration complete, proceed with the installation and patching of Oracle Grid Infrastructure 19c.

Unless otherwise specified, perform the following steps as the `oracle` operating system user.

### Extract the Grid Infrastructure Software

Extract the Oracle Grid Infrastructure 19c installation archive directly into the Grid home:

```bash
[oracle@binary ~]$ unzip -q /u01/staging/software/LINUX.X64_193000_grid_home.zip -d /u01/app/19.0.0/grid
```

The Grid home for this installation is:

```text
/u01/app/19.0.0/grid
```

### Update OPatch

Before applying the Grid Infrastructure Release Update, update the OPatch utility to the version required by the selected patch.

Preserve the OPatch version included with the 19.3 Grid Infrastructure software by renaming the existing directory:

```bash
[oracle@binary ~]$ mv /u01/app/19.0.0/grid/OPatch /u01/app/19.0.0/grid/OPatch_$(date +'%d-%m-%Y')
```

Verify that the original OPatch directory has been renamed:

```bash
[oracle@binary ~]$ ls -ld /u01/app/19.0.0/grid/*OPatch*
drwxr-x---. 14 oracle oinstall 4096 Apr 12  2019 /u01/app/19.0.0/grid/OPatch_03-10-2026
drwxr-xr-x.  2 oracle oinstall 4096 Apr 17  2019 /u01/app/19.0.0/grid/QOpatch
```

Extract the updated OPatch utility into the Grid home:

```bash
[oracle@binary ~]$ unzip -q /u01/staging/patches/p6880880_190000_Linux-x86-64.zip -d /u01/app/19.0.0/grid
```

Verify the installed OPatch version:

```bash
[oracle@binary ~]$ /u01/app/19.0.0/grid/OPatch/opatch version
OPatch Version: 12.2.0.1.53

OPatch succeeded.
```

> **Note**
>
> Always verify the minimum OPatch version required by the selected Grid Infrastructure Release Update in the patch README before applying the patch.

### Extract the Grid Infrastructure Release Update

Extract the downloaded OJVM and Grid Infrastructure combo patch into the patch staging directory:

```bash
[oracle@binary ~]$ unzip -q /u01/staging/patches/p39618711_190000_Linux-x86-64.zip -d /u01/staging/patches/
```

The extracted patch directory will be used when applying the Release Update to the Grid Infrastructure home.

### Configure Graphical Access

Oracle Grid Infrastructure can be installed using the graphical installer or in silent mode. This guide uses the graphical installer.

Graphical access can be provided through an X11-capable client or by configuring a VNC session. In this environment, TigerVNC is used to provide graphical access to the server.

As the `oracle` user, start a VNC session on display `:1`:

```bash
[oracle@binary ~]$ vncserver :1

WARNING: vncserver has been replaced by a systemd unit and is now considered deprecated and removed in upstream.
Please read /usr/share/doc/tigervnc/HOWTO.md for more information.

New 'binary:1 (oracle)' desktop is binary:1

Creating default startup script /home/oracle/.vnc/xstartup
Creating default config /home/oracle/.vnc/config
Starting applications specified in /home/oracle/.vnc/xstartup
Log file is /home/oracle/.vnc/binary:1.log
```

Verify that the VNC server is listening on TCP port `5901`:

```bash
[oracle@binary ~]$ ss -lntp | grep 5901
LISTEN 0  5  0.0.0.0:5901  0.0.0.0:*  users:(("Xvnc",pid=2876,fd=9))
LISTEN 0  5     [::]:5901     [::]:*  users:(("Xvnc",pid=2876,fd=10))
```

VNC display `:1` uses TCP port `5901`.

### Allow VNC Through the Firewall

If `firewalld` is enabled, allow connections to the VNC session through TCP port `5901`.

Run the following commands as `root`:

```bash id="63w17c"
[root@binary ~]# firewall-cmd --permanent --add-port=5901/tcp
success

[root@binary ~]# firewall-cmd --reload
success

[root@binary ~]# firewall-cmd --list-ports
5901/tcp
```

> **Important**
>
> Opening TCP port `5901` exposes the VNC service to networks permitted by the server's firewall and network configuration. Restrict VNC access to trusted administration networks where possible, and remove the firewall rule when direct VNC access is no longer required.

Connect to the server using any VNC-compatible client. For display `:1`, the VNC server listens on TCP port `5901`.

In this guide, **Remmina** on Fedora Linux is used to connect to the VNC session on port `5901`. After establishing the connection, continue with the Oracle Grid Infrastructure installation.

![VNC](./screenshots/vnc.png)

### Identify the Grid Infrastructure Patch

The combo patch contains multiple patch directories. Before starting the Grid Infrastructure installer, identify the patch directory that contains the Grid Infrastructure Release Update.

Change to the extracted combo patch directory:

```bash
[oracle@binary ~]$ cd /u01/staging/patches/39618711
```

Display the size of each extracted patch directory:

```bash id="ydr2d8"
[oracle@binary 39618711]$ du -sh * | sort -h
24K     README.html
36K     PatchSearch.xml
439M    39222882
6.0G    39467003
```

For this combo patch:

| Patch | Size | Component |
| --- | ---: | --- |
| `39222882` | 439 MB | OJVM Release Update |
| `39467003` | 6.0 GB | Grid Infrastructure Release Update |

The Grid Infrastructure patch that will be applied during installation is therefore:

```
/u01/staging/patches/39618711/39467003
```

> **Note**
>
> The patch numbers and directory sizes change between Release Updates. Always verify the component patch numbers in the `README.html` supplied with the combo patch. Comparing directory sizes is a convenient way to distinguish the extracted patches in this example, but the patch README should be treated as the authoritative reference.

### Apply the GI Release Update and Launch the Installer

Launch the Oracle Grid Infrastructure installer with the `-applyRU` option and specify the Grid Infrastructure Release Update identified in the previous step:

```bash
[oracle@binary ~]$ /u01/app/19.0.0/grid/gridSetup.sh -applyRU /u01/staging/patches/39618711/39467003
```

The installer first applies the specified Release Update to the Grid Infrastructure home. After the patching operation completes successfully, the graphical Oracle Grid Infrastructure installer opens and the Grid Infrastructure configuration can continue through the GUI.

> **Note**
>
>Applying the Release Update typically takes approximately 10–15 minutes, depending on the system performance. During this time, the installer patches the Grid Infrastructure home. After the patching process completes successfully, the graphical installer opens automatically.

![VNC2](./screenshots/vnc2.png)

### Install the Grid Infrastructure Software

After the Release Update has been applied, the Oracle Grid Infrastructure graphical installer opens automatically.

![GI](./screenshots/g1.png)
![GI](./screenshots/g2.png)
![GI](./screenshots/g3.png)
![GI](./screenshots/g4.png)
![GI](./screenshots/g5.png)
![GI](./screenshots/g6.png)
![GI](./screenshots/g7.png)
![GI](./screenshots/g8.png)
![GI](./screenshots/g9.png)
![GI](./screenshots/g10.png)
![GI](./screenshots/g11.png)

Run the required scripts as the `root` user in a separate terminal session:

```bash
[root@binary ~]# /u01/app/oraInventory/orainstRoot.sh 
Changing permissions of /u01/app/oraInventory.
Adding read,write permissions for group.
Removing read,write,execute permissions for world.

Changing groupname of /u01/app/oraInventory to oinstall.
The execution of the script is complete.
[root@binary ~]# /u01/app/19.0.0/grid/root.sh
Performing root user operation.

The following environment variables are set as:
    ORACLE_OWNER= oracle
    ORACLE_HOME=  /u01/app/19.0.0/grid

Enter the full pathname of the local bin directory: [/usr/local/bin]: 
   Copying dbhome to /usr/local/bin ...
   Copying oraenv to /usr/local/bin ...
   Copying coraenv to /usr/local/bin ...


Creating /etc/oratab file...
Entries will be added to the /etc/oratab file as needed by
Database Configuration Assistant when a database is created
Finished running generic part of root script.
Now product-specific root actions will be performed.

To configure Grid Infrastructure for a Cluster or Grid Infrastructure for a Stand-Alone Server execute the following command as oracle user:
/u01/app/19.0.0/grid/gridSetup.sh
This command launches the Grid Infrastructure Setup Wizard. The wizard also supports silent operation, and the parameters can be passed through the response file that is available in the installation media.
```

![GI](./screenshots/g12.png)

### Verify the Grid Infrastructure Patches

After the Grid Infrastructure software installation completes, verify that the Release Update patches were successfully applied to the Grid home.

Run the following command as the `oracle` user:

```bash
[oracle@binary ~]$ /u01/app/19.0.0/grid/OPatch/opatch lspatches
39526364;OCW RELEASE UPDATE 19.32.0.0.0 (39526364)
39503034;ACFS RELEASE UPDATE 19.32.0.0.0 (39503034)
39472050;Database Release Update : 19.32.0.0.260721 (39472050)
39107855;TOMCAT RELEASE UPDATE 19.0.0.0.0 (39107855)
39107825;DBWLM RELEASE UPDATE 19.0.0.0.0 (39107825)

OPatch succeeded.
```

### Configure Oracle Grid Infrastructure

With the Grid Infrastructure software installed and patched, the next step is to configure Oracle Grid Infrastructure and Oracle ASM.

Return to the **same terminal in the VNC session** as the `oracle` user and start the Grid Infrastructure installer:

```bash
[oracle@binary ~]$ /u01/app/19.0.0/grid/gridSetup.sh
```

![GI](./screenshots/gis1.png)

On the **Create ASM Disk Group** screen, change the ASM disk discovery path from the default device path to the Oracle ASMLIB discovery string:

```text
ORCL:*
```

![GI](./screenshots/gis2.png)
![GI](./screenshots/gis3.png)
![GI](./screenshots/gis4.png)
![GI](./screenshots/gis5.png)
![GI](./screenshots/gis6.png)
![GI](./screenshots/gis7.png)
![GI](./screenshots/gis8.png)
![GI](./screenshots/gis9.png)
![GI](./screenshots/gis10.png)

Run the required scripts as the `root` user in a separate terminal session:

```bash
[root@binary ~]# /tmp/GridSetupActions2026-10-03_03-10-03PM/CVU_19_oracle_2026-10-03_15-10-16_12511/runfixup.sh 
All Fix-up operations were completed successfully.
```

![GI](./screenshots/gis11.png)
![GI](./screenshots/gis12.png)
![GI](./screenshots/gis13.png)

Run the required scripts as the `root` user in a separate terminal session:

```bash
[root@binary ~]# /u01/app/19.0.0/grid/root.sh
Performing root user operation.

The following environment variables are set as:
    ORACLE_OWNER= oracle
    ORACLE_HOME=  /u01/app/19.0.0/grid

Enter the full pathname of the local bin directory: [/usr/local/bin]:  <<< ENTER
The contents of "dbhome" have not changed. No need to overwrite.
The contents of "oraenv" have not changed. No need to overwrite.
The contents of "coraenv" have not changed. No need to overwrite.

Entries will be added to the /etc/oratab file as needed by
Database Configuration Assistant when a database is created
Finished running generic part of root script.
Now product-specific root actions will be performed.
Using configuration parameter file: /u01/app/19.0.0/grid/crs/install/crsconfig_params
The log of current session can be found at:
  /u01/app/oracle/crsdata/binary/crsconfig/roothas_2026-10-03_03-16-52PM.log
Redirecting to /bin/systemctl restart rsyslog.service
LOCAL ADD MODE 
Creating OCR keys for user 'oracle', privgrp 'oinstall'..
Operation successful.
LOCAL ONLY MODE 
Successfully accumulated necessary OCR keys.
Creating OCR keys for user 'root', privgrp 'root'..
Operation successful.
CRS-4664: Node binary successfully pinned.
2026/10/03 15:17:24 CLSRSC-330: Adding Clusterware entries to file 'oracle-ohasd.service'

binary     2026/10/03 15:18:06     /u01/app/oracle/crsdata/binary/olr/backup_20261003_151806.olr     3004609525     
2026/10/03 15:18:07 CLSRSC-327: Successfully configured Oracle Restart for a standalone server
```

![GI](./screenshots/gis14.png)
![GI](./screenshots/gis15.png)

### Create the RECO ASM Disk Group

After completing the Oracle Grid Infrastructure configuration, create the `RECO` disk group using Oracle ASM Configuration Assistant (ASMCA).

From the **same VNC session**, run ASMCA as the `oracle` user:

```bash
[oracle@binary ~]$ /u01/app/19.0.0/grid/bin/asmca
```

![asmca](./screenshots/asmca1.png)
![asmca](./screenshots/asmca2.png)
![asmca](./screenshots/asmca3.png)
![asmca](./screenshots/asmca4.png)
![asmca](./screenshots/asmca5.png)

### Verify the Grid Infrastructure Configuration

After completing the Grid Infrastructure and ASM configuration, verify that the ASM instance, disk groups, and Oracle Restart resources are running correctly.

First, verify that the ASM instance is running:

```bash
[oracle@binary ~]$ ps -ef | grep smon
oracle     20006       1  0 15:19 ?        00:00:00 asm_smon_+ASM
oracle     21127    1608  0 15:23 pts/1    00:00:00 grep --color=auto smon
```

Set the Oracle environment for the ASM instance:

```bash
[oracle@binary ~]$ . oraenv <<< +ASM
ORACLE_SID = [oracle] ? The Oracle base has been set to /u01/app/oracle
```

Verify that the ASM disk groups are mounted:

```bash
[oracle@binary ~]$ asmcmd lsdg
State    Type    Rebal  Sector  Logical_Sector  Block       AU  Total_MB  Free_MB  Req_mir_free_MB  Usable_file_MB  Offline_disks  Voting_files  Name
MOUNTED  EXTERN  N         512             512   4096  4194304    102396   102292                0          102292              0             N  DATA/
MOUNTED  EXTERN  N         512             512   4096  4194304     51196    51100                0           51100              0             N  RECO/
```

Finally, verify the Oracle Restart resources:

```bash
[oracle@binary ~]$ crsctl stat res -t
--------------------------------------------------------------------------------
Name           Target  State        Server                   State details       
--------------------------------------------------------------------------------
Local Resources
--------------------------------------------------------------------------------
ora.DATA.dg
               ONLINE  ONLINE       binary                   STABLE
ora.LISTENER.lsnr
               ONLINE  ONLINE       binary                   STABLE
ora.RECO.dg
               ONLINE  ONLINE       binary                   STABLE
ora.asm
               ONLINE  ONLINE       binary                   Started,STABLE
ora.ons
               OFFLINE OFFLINE      binary                   STABLE
--------------------------------------------------------------------------------
Cluster Resources
--------------------------------------------------------------------------------
ora.cssd
      1        ONLINE  ONLINE       binary                   STABLE
ora.diskmon
      1        OFFLINE OFFLINE                               STABLE
ora.evmd
      1        ONLINE  ONLINE       binary                   STABLE
--------------------------------------------------------------------------------
```

## Oracle Database Installation and Configuration

With Oracle Grid Infrastructure, Oracle Restart, and the ASM disk groups configured and verified, proceed with the installation, patching, and configuration of Oracle Database 19c.

The Oracle Database software will first be extracted into the Database home, updated with the required OPatch version, and patched to the selected 19c Release Update before the database is created.

### Extract the Oracle Database Software

Extract the Oracle Database 19c installation archive directly into the Oracle Database home:

```bash
[oracle@binary ~]$ unzip -q /u01/staging/software/LINUX.X64_193000_db_home.zip -d /u01/app/oracle/product/19.0.0/dbhome_1/
```

### Update OPatch

Before applying the Oracle Database Release Update, update the OPatch utility to the version required by the selected patch.

Preserve the OPatch version included with the Oracle Database 19.3 software by renaming the existing directory:

```bash
[oracle@binary ~]$ mv /u01/app/oracle/product/19.0.0/dbhome_1/OPatch /u01/app/oracle/product/19.0.0/dbhome_1/OPatch_$(date +'%d-%m-%Y')
```

Verify that the original OPatch directory has been renamed:

```bash
[oracle@binary ~]$ ls -ld /u01/app/oracle/product/19.0.0/dbhome_1/OPatch*
drwxr-x---. 14 oracle oinstall 4096 Apr 12  2019 /u01/app/oracle/product/19.0.0/dbhome_1/OPatch_03-10-2026
```

Extract the updated OPatch utility into the Database home:

```bash
[oracle@binary ~]$ unzip -q /u01/staging/patches/p6880880_190000_Linux-x86-64.zip -d /u01/app/oracle/product/19.0.0/dbhome_1/
```

Verify the installed OPatch version:

```bash
[oracle@binary ~]$ /u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch version
OPatch Version: 12.2.0.1.53

OPatch succeeded.
```

> **Note**
>
> Always verify the minimum OPatch version required by the selected Database Release Update in the patch README before applying the patch.

### Install and Patch the Database Software

The Oracle Database Release Update is included in the OJVM and Grid Infrastructure combo patch that was extracted earlier. Therefore, no additional patch extraction is required.

The same VNC session used during the Grid Infrastructure installation can be reused. If the VNC session has been closed, start a new session before continuing.

The patch numbers and component names can be verified in the `README.html` included with the Grid Infrastructure Release Update:

```text
/u01/staging/patches/39618711/39467003/README.html
```

![Patch table](./screenshots/patches.png)

For this Release Update, the following patches are applied to the Oracle Database home:

| Patch | Purpose |
| --- | --- |
| `39472050` | Oracle Database Release Update |
| `39526364` | Oracle Clusterware (OCW) Release Update |
| `39222882` | Oracle JavaVM (OJVM) Release Update |

Run the installer from the VNC session as the `oracle` user:

```bash
[oracle@binary ~]$ /u01/app/oracle/product/19.0.0/dbhome_1/runInstaller -applyRU /u01/staging/patches/39618711/39467003/39472050 -applyOneOffs /u01/staging/patches/39618711/39467003/39526364,/u01/staging/patches/39618711/39222882
```

The `-applyRU` option applies the Database Release Update, while `-applyOneOffs` applies the OCW and OJVM patches to the Oracle Database home.

> **Note**
>
> Patch numbers change between Release Updates. Always verify the component patch numbers in the patch README before applying them.

The installer applies the specified patches before opening the Oracle Database graphical installer. This process can take several minutes depending on system performance.

![Patch table](./screenshots/patches2.png)

Follow the installer prompts to complete the Oracle Database software installation.

> **Note**
>
> At this stage, only the Oracle Database software is installed. The database will be created and configured separately after the software installation is complete.

![DB](./screenshots/db1.png)
![DB](./screenshots/db2.png)
![DB](./screenshots/db3.png)
![DB](./screenshots/db4.png)
![DB](./screenshots/db5.png)
![DB](./screenshots/db6.png)
![DB](./screenshots/db7.png)
![DB](./screenshots/db8.png)
![DB](./screenshots/db9.png)
![DB](./screenshots/db10.png)
![DB](./screenshots/db11.png)

Run the required scripts as the `root` user in a separate terminal session:

```bash
[root@binary ~]# /u01/app/oracle/product/19.0.0/dbhome_1/root.sh
Performing root user operation.

The following environment variables are set as:
    ORACLE_OWNER= oracle
    ORACLE_HOME=  /u01/app/oracle/product/19.0.0/dbhome_1

Enter the full pathname of the local bin directory: [/usr/local/bin]: 
The contents of "dbhome" have not changed. No need to overwrite.
The contents of "oraenv" have not changed. No need to overwrite.
The contents of "coraenv" have not changed. No need to overwrite.

Entries will be added to the /etc/oratab file as needed by
Database Configuration Assistant when a database is created
Finished running generic part of root script.
Now product-specific root actions will be performed.
```

![DB](./screenshots/db12.png)

### Verify the Oracle Database Patch Level

After the Oracle Database software installation completes, verify that the required patches were successfully applied to the Database home.

```bash
[oracle@binary ~]$ /u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch lspatches
39222882;OJVM RELEASE UPDATE: 19.32.0.0.260721 (39222882)
39526364;OCW RELEASE UPDATE 19.32.0.0.0 (39526364)
39472050;Database Release Update : 19.32.0.0.260721 (39472050)

OPatch succeeded.
```

The output confirms that the Oracle Database home has been patched with the required **19.32 Database RU, OCW RU, and OJVM RU**.

The Oracle Database software is now installed and patched to the desired level and is ready for database creation.

> **Note**
>
> In this guide, **Oracle Database Enterprise Edition** was selected during the software installation. The database edition should be selected according to your organization's Oracle licenses and technical requirements.
>
> Some features are available only with Enterprise Edition or require additional licenses. For example, Oracle Data Guard is available with Enterprise Edition, while Oracle Active Data Guard is a separately licensed Enterprise Edition option. Always verify your organization's license entitlements before enabling or using licensed features.

### Create the Oracle Database

With the Oracle Database software installed and patched, create the database using Oracle Database Configuration Assistant (DBCA).

The same VNC session used during the Oracle Database software installation can be reused. If the session is no longer active, start a new VNC session before proceeding.

Run DBCA as the `oracle` user:

```bash
[oracle@binary ~]$ /u01/app/oracle/product/19.0.0/dbhome_1/bin/dbca
```

The Oracle Database Configuration Assistant opens. Follow the graphical wizard to create and configure the database.

![DB](./screenshots/dbca1.png)
![DB](./screenshots/dbca2.png)
![DB](./screenshots/dbca3.png)
![DB](./screenshots/dbca4.png)
![DB](./screenshots/dbca5.png)
![DB](./screenshots/dbca6.png)
![DB](./screenshots/dbca7.png)
![DB](./screenshots/dbca8.png)
![DB](./screenshots/dbca9.png)
![DB](./screenshots/dbca10.png)
![DB](./screenshots/dbca11.png)
![DB](./screenshots/dbca12.png)
![DB](./screenshots/dbca13.png)
![DB](./screenshots/dbca14.png)
![DB](./screenshots/dbca15.png)

#### Database Architecture

For this test environment, a **non-CDB database** is created. Before selecting this architecture, verify the compatibility requirements of the application.

For new deployments, use the **CDB/PDB architecture whenever the application supports it**. The non-CDB architecture is deprecated in Oracle Database 19c and desupported starting with Oracle Database 21c. Consequently, a 19c non-CDB must be converted to a PDB as part of the migration path to later Oracle Database releases.

> **Important**
>
> Consider the future upgrade path before deploying a new Oracle Database 19c non-CDB. Using the CDB/PDB architecture from the beginning avoids the additional non-CDB-to-PDB conversion required for future releases.

#### Database Configuration

Because this environment is intended for testing, the default DBCA parameters are used where appropriate.

For production environments, database parameters should be configured according to the application workload, available system resources, availability requirements, recovery objectives, and security requirements.

> **Important**
>
> A production database should have a properly designed and tested backup and recovery strategy. When point-in-time recovery and online backups are required, **ARCHIVELOG mode is essential**.
>
> Running a production database without an appropriate recovery strategy is not technically a criminal offense, but it may feel remarkably close to one when a media failure occurs and the required archived redo logs do not exist.

### Verify the Database

After DBCA completes, verify that the database instance is running and that the database can be accessed successfully.

Verify that the database instance is running:

```bash
[oracle@binary ~]$ ps -ef | grep smon
oracle     20006       1  0 15:19 ?        00:00:00 asm_smon_+ASM
oracle     38498       1  0 18:00 ?        00:00:00 ora_smon_PROD
oracle     38978    1608  0 18:07 pts/1    00:00:00 grep --color=auto smon

```

Set the Oracle environment for the database instance:

```bash
[oracle@binary ~]$ . oraenv <<< PROD
ORACLE_SID = [+ASM] ? The Oracle base remains unchanged with value /u01/app/oracle
```

Connect to the database as `SYSDBA`:

```bash
[oracle@binary ~]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Sat Oct 3 18:08:05 2026
Version 19.32.0.0.0

Copyright (c) 1982, 2026, Oracle.  All rights reserved.


Connected to:
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
Version 19.32.0.0.0

SQL> 
```

Verify the instance status:

```sql

SQL> select instance_name, status, database_status from v$instance;

INSTANCE_NAME    STATUS       DATABASE_STATUS
---------------- ------------ -----------------
PROD             OPEN         ACTIVE
```

Verify that the database is open:

```sql
SQL> select name, open_mode, log_mode from v$database;

NAME      OPEN_MODE            LOG_MODE
--------- -------------------- ------------
PROD      READ WRITE           ARCHIVELOG
```

> **Important**
>
> For production environments, configure and test an appropriate backup and recovery strategy. If point-in-time recovery and online backups are required, enable **ARCHIVELOG** mode before placing the database into production.

### Verify the Oracle Restart Resources

Verify that Oracle Restart is managing the database, ASM, listener, and ASM disk groups:

```bash
[oracle@binary ~]$ /u01/app/19.0.0/grid/bin/crsctl stat res -t
--------------------------------------------------------------------------------
Name           Target  State        Server                   State details       
--------------------------------------------------------------------------------
Local Resources
--------------------------------------------------------------------------------
ora.DATA.dg
               ONLINE  ONLINE       binary                   STABLE
ora.LISTENER.lsnr
               ONLINE  ONLINE       binary                   STABLE
ora.RECO.dg
               ONLINE  ONLINE       binary                   STABLE
ora.asm
               ONLINE  ONLINE       binary                   Started,STABLE
ora.ons
               OFFLINE OFFLINE      binary                   STABLE
--------------------------------------------------------------------------------
Cluster Resources
--------------------------------------------------------------------------------
ora.cssd
      1        ONLINE  ONLINE       binary                   STABLE
ora.diskmon
      1        OFFLINE OFFLINE                               STABLE
ora.evmd
      1        ONLINE  ONLINE       binary                   STABLE
ora.prod.db
      1        ONLINE  ONLINE       binary                   Open,HOME=/u01/app/o
                                                             racle/product/19.0.0
                                                             /dbhome_1,STABLE
--------------------------------------------------------------------------------
```

Verify that the database resource, ASM instance, listener, and the `DATA` and `RECO` disk groups report the expected `ONLINE` state.

The database can also be verified through Oracle Restart using SRVCTL:

```bash
[oracle@binary ~]$ /u01/app/19.0.0/grid/bin/srvctl status database -db PROD
Database is running.
[oracle@binary ~]$ /u01/app/19.0.0/grid/bin/srvctl config database -db PROD
Database unique name: PROD
Database name: PROD
Oracle home: /u01/app/oracle/product/19.0.0/dbhome_1
Oracle user: oracle
Spfile: +DATA/PROD/PARAMETERFILE/spfile.266.1245693547
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
Database instance: PROD
```

## Summary

Oracle Database 19c and Oracle Grid Infrastructure 19c are now installed, patched, and configured with Oracle ASMLIB v3.

The completed environment includes:

- Oracle Grid Infrastructure 19c patched to the selected Release Update
- Oracle Restart configured and operational
- Oracle ASMLIB v3 configured with `io_uring` on UEK8
- `DATA` and `RECO` ASM disk groups using ASMLIB-labeled storage
- Oracle Database 19c patched with the Database RU, OCW RU, and OJVM RU
- Oracle Database registered with Oracle Restart and using ASM storage
- Database connectivity and instance status successfully verified

The installation used Oracle Database 19.3 and Oracle Grid Infrastructure 19.3 base software and applied the selected Release Update during installation. This approach avoids configuring the Oracle homes at the original 19.3 patch level before subsequently patching them.

For future installations, always review the README supplied with the selected Release Update and verify the required OPatch version, component patch numbers, prerequisites, and post-installation requirements before applying the patches.

The environment is now ready for application-specific database configuration, backup and recovery configuration, and further production hardening as required.

