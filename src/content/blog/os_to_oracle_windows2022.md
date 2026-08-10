---
title: "From OS to Oracle: Install Oracle Grid Infrastructure and Database 19c on Windows Server 2022"
description: "Step-by-step installation of Windows Server 2022, Oracle Grid Infrastructure 19c with ASM, and Oracle Database 19c."
pubDate: 2025-11-08
tags:
  - Oracle Database
  - Oracle 19c
  - Oracle Grid Infrastructure
  - ASM
  - Windows Server 2022
---

# From OS to Oracle: Install Oracle Grid Infrastructure and Database 19c on Windows Server 2022

Setting up a reliable Oracle Database environment starts with a properly prepared operating system and storage configuration.

This guide demonstrates the complete process of installing **Microsoft Windows Server 2022**, configuring **Standalone Oracle Grid Infrastructure 19c with Oracle ASM**, and creating an **Oracle Database 19c**.

The procedure covers the initial server preparation, storage configuration, Grid Infrastructure installation, ASM configuration, Oracle Database software installation, database creation, and final environment verification.

## Prerequisites

Before beginning the installation, download the required installation media.

### Oracle Grid Infrastructure and Oracle Database

Download the Oracle Database 19c software for Microsoft Windows from the official Oracle website:

- [Oracle Database 19c for Microsoft Windows](https://www.oracle.com/database/technologies/oracle19c-windows-downloads.html)

The following installation archives are used in this guide:

```text
WINDOWS.X64_193000_grid_home.zip
WINDOWS.X64_193000_db_home.zip
```
### Microsoft Windows Server 2022

Download the Windows Server 2022 installation media from the Microsoft Evaluation Center:

- [Windows Server 2022](https://www.microsoft.com/en-us/evalcenter/download-windows-server-2022)

## System Configuration

For this environment, the Windows Server is configured with four disks:

| Disk | Size | Purpose |
| --- | ---: | --- |
| Disk 1 | 100 GB | Windows Server operating system |
| Disk 2 | 100 GB | Oracle Grid Infrastructure and Database binaries |
| Disk 3 | 50 GB | Oracle ASM `DATA` disk |
| Disk 4 | 50 GB | Oracle ASM `RECO` disk |

The configuration is intended as a demonstration environment. Adjust the storage capacity according to the requirements of your environment.

## Install Windows Server 2022

Install Windows Server 2022 on the **100 GB operating system disk**.

Complete the standard Winhttp://localhost:4321/blog/os_to_oracle_windows2022/dows Server installation and log in to the server after the installation has finished.

![Windows Installation](./screenshots/win_2.png)
![Windows Installation](./screenshots/win_1.png)
![Windows Installation](./screenshots/win_3.png)
![Windows Installation](./screenshots/win_5.png)
![Windows Installation](./screenshots/win_6.png)
![Windows Installation](./screenshots/win_7.png)
![Windows Installation](./screenshots/win_8.png)
![Windows Installation](./screenshots/win_9.png)
![Windows Installation](./screenshots/win_10.png)

## Enable Remote Desktop Access

Enable **Remote Desktop (RDP)** if remote administration of the Windows Server is required.

![RDP](./screenshots/rdp1.png)
![RDP](./screenshots/rdp2.png)
![RDP](./screenshots/rdp3.png)

## Configure the Disks

After installing Windows Server, configure the additional storage.

The disk used for the Oracle software binaries and the disks used by Oracle ASM require different configurations.

### Oracle Software Disk

**Disk 2**, which is used for the Oracle Grid Infrastructure and Oracle Database software, should be formatted with the **NTFS** file system and assigned a drive letter.

In this environment, the Oracle software is installed under the `O:` drive.

![Format](./screenshots/format_disk1.png)
![Format](./screenshots/format_disk2.png)
![Format](./screenshots/format_disk3.png)
![Format](./screenshots/format_disk4.png)
![Format](./screenshots/format_disk5.png)
![Format](./screenshots/format_disk6.png)
![Format](./screenshots/format_disk7.png)

### Oracle ASM Disks

**Disk 3** and **Disk 4** are reserved for Oracle ASM.

Do **not** format these disks with NTFS and do **not** assign drive letters to them. The disks will be prepared for Oracle ASM later using the Oracle ASM disk tools.

The disks are used as follows:

- **Disk 3** — `DATA`
- **Disk 4** — `RECO`


![Format](./screenshots/format_disk8.png)
![Format](./screenshots/format_disk9.png)
![Format](./screenshots/format_disk10.png)
![Format](./screenshots/format_disk11.png)
![Format](./screenshots/format_disk12.png)
![Format](./screenshots/format_disk13.png)
![Format](./screenshots/format_disk14.png)

## Create the Oracle Installation User

Oracle software can be installed using either a **local Windows user** or an **Active Directory domain user**.

For additional information about Oracle installation user requirements, refer to the Oracle documentation:

- [About the Oracle Installation User](https://docs.oracle.com/en/database/oracle/oracle-database/19/cwwin/about-the-oracle-installation-user.html)

The account used to install **Oracle Grid Infrastructure** or **Oracle Database** must have the required administrative privileges.

For this environment, a local Windows user named `oracle` is used to install and configure the Oracle software.

If a local user account is used for an Oracle Grid Infrastructure or Oracle RAC installation with multiple nodes:

- The same user account must exist on all cluster nodes.
- The username and password must be identical on all nodes.
- The user must be an explicit member of the local **Administrators** group on the applicable nodes.
- Oracle Universal Installer might display a warning when a local account is used.

![User](./screenshots/user1.png)
![User](./screenshots/user2.png)
![User](./screenshots/user3.png)
![User](./screenshots/user4.png)
![User](./screenshots/user5.png)
![User](./screenshots/user6.png)

## Prepare the Grid Infrastructure Oracle Home

Create the directory that will contain the Oracle Grid Infrastructure software.

Open Command Prompt using the `oracle` installation user and run:

```cmd
C:\Users\oracle>mkdir O:\app\19.0.0\grid
```

The Grid Infrastructure Oracle Home for this environment is:

```text
O:\app\19.0.0\grid
```

## Extract the Grid Infrastructure Software

Change to the directory containing the downloaded Oracle installation archives:

```cmd
C:\Users\oracle>cd Downloads
```

Verify the downloaded files:

```cmd
C:\Users\oracle\Downloads>dir
 Volume in drive C has no label.
 Volume Serial Number is E02C-1259

 Directory of C:\Users\oracle\Downloads

08.11.2025  04:48     3 105 763 999 WINDOWS.X64_193000_db_home.zip
08.11.2025  04:47     2 181 665 470 WINDOWS.X64_193000_grid_home.zip
2 File(s)  5 287 429 469 bytes
2 Dir(s)  88 209 842 176 bytes free
```

Extract the Grid Infrastructure archive directly into the Grid Infrastructure Oracle Home:

```cmd
C:\Users\oracle\Downloads>tar -xf WINDOWS.X64_193000_grid_home.zip -C O:\app\19.0.0\grid
```

The Grid Infrastructure software is now staged under:

```text
O:\app\19.0.0\grid
```

## Configure the Windows Time Service

Configure the **Windows Time Service** before proceeding with the Grid Infrastructure installation.

For additional information, refer to the Oracle Grid Infrastructure Installation and Upgrade Guide for Microsoft Windows:

- [Oracle Grid Infrastructure Installation and Upgrade Guide for Microsoft Windows](https://docs.oracle.com/en/database/oracle/oracle-database/19/cwwin/grid-infrastructure-installation-and-upgrade-guide-microsoft-windows.pdf)

Open **Command Prompt as Administrator**.

Register the Windows Time service:

```cmd
C:\Windows\system32>w32tm /register
W32Time successfully registered.
```

Configure the maximum positive time correction:

```cmd
C:\Windows\system32>reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Config" /v MaxPosPhaseCorrection /t REG_DWORD /d 600 /f
The operation completed successfully.
```

Configure the maximum negative time correction:

```cmd
C:\Windows\system32>reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Config" /v MaxNegPhaseCorrection /t REG_DWORD /d 600 /f
The operation completed successfully.
```

Configure the maximum allowed phase offset:

```cmd
C:\Windows\system32>reg add "HKLM\SYSTEM\CurrentControlSet\Services\W32Time\Config" /v MaxAllowedPhaseOffset /t REG_DWORD /d 600 /f
The operation completed successfully.
```

Apply the updated Windows Time configuration:

```cmd
C:\Windows\system32>w32tm /config /update
The command completed successfully.
```

The operating system and initial Oracle Grid Infrastructure prerequisites are now prepared.

## Install Oracle Grid Infrastructure

After preparing the Grid Infrastructure Oracle Home and configuring the Windows Time Service, start the Oracle Grid Infrastructure installer.

Open **Command Prompt as Administrator** and change to the Grid Infrastructure Oracle Home:

```cmd
C:\Windows\system32>O:

O:\>cd O:\app\19.0.0\grid

O:\app\19.0.0\grid>setup.exe
Launching Oracle Database Setup Wizard...
```

Follow the Oracle Grid Infrastructure installation wizard to install the software.

![GI](./screenshots/grid9.png)
![GI](./screenshots/grid8.png)
![GI](./screenshots/grid7.png)
![GI](./screenshots/grid5.png)
![GI](./screenshots/grid4.png)
![GI](./screenshots/grid6.png)
![GI](./screenshots/grid3.png)
![GI](./screenshots/grid2.png) 
![GI](./screenshots/grid1.png)


## Stamp the Oracle ASM Disks

After installing the Grid Infrastructure software, prepare the disks that will be used by Oracle ASM.

Change to the Grid Infrastructure `bin` directory:

```cmd
O:\app\19.0.0\grid>cd bin
```

List the available disks:

```cmd
O:\app\19.0.0\grid\bin>asmtool -list
NTFS                             \Device\Harddisk0\Partition1              100M
NTFS                             \Device\Harddisk0\Partition2           101773M
NTFS                             \Device\Harddisk0\Partition3              524M
NTFS                             \Device\Harddisk1\Partition1           102397M
                                 \Device\Harddisk2\Partition1            51197M
                                 \Device\Harddisk3\Partition1            51197M
```

The two unformatted 50 GB disks are visible as:

```text
\Device\Harddisk2\Partition1
\Device\Harddisk3\Partition1
```

Stamp the first disk for the `RECO` disk group:

```cmd
O:\app\19.0.0\grid\bin>asmtool -add \Device\Harddisk2\Partition1 ORCLDISKRECO01
```

Stamp the second disk for the `DATA` disk group:

```cmd
O:\app\19.0.0\grid\bin>asmtool -add \Device\Harddisk3\Partition1 ORCLDISKDATA01
```

Verify the ASM disk configuration:

```cmd
O:\app\19.0.0\grid\bin>asmtool -list
NTFS                             \Device\Harddisk0\Partition1              100M
NTFS                             \Device\Harddisk0\Partition2           101773M
NTFS                             \Device\Harddisk0\Partition3              524M
NTFS                             \Device\Harddisk1\Partition1           102397M
ORCLDISKRECO01                   \Device\Harddisk2\Partition1            51197M
ORCLDISKDATA01                   \Device\Harddisk3\Partition1            51197M
```

The disks are now stamped and available for use by Oracle ASM.

## Configure Oracle Grid Infrastructure

Return to the Grid Infrastructure Oracle Home:

```cmd
O:\app\19.0.0\grid\bin>cd ..
```

Start the Grid Infrastructure installer again:

```cmd
O:\app\19.0.0\grid>setup.exe
Launching Oracle Database Setup Wizard...
```

Complete the Grid Infrastructure configuration using the installation wizard.

During the configuration, use the previously prepared ASM disk for the `DATA` disk group.

```text
ORCLDISKDATA01
```

![GI_CONF](./screenshots/conf_gi_1.png)
![GI_CONF](./screenshots/conf_gi_2.png)
![GI_CONF](./screenshots/conf_gi_3.png)
![GI_CONF](./screenshots/conf_gi_4.png)
![GI_CONF](./screenshots/conf_gi_5.png)
![GI_CONF](./screenshots/conf_gi_6.png)
![GI_CONF](./screenshots/conf_gi_7.png)
![GI_CONF](./screenshots/conf_gi_8.png)

## Create the RECO ASM Disk Group

After completing the initial Grid Infrastructure configuration, create the `RECO` disk group using **Oracle ASM Configuration Assistant (ASMCA)**.

Open **Command Prompt as Administrator**:

```cmd
C:\Windows\system32>O:

O:\>cd O:\app\19.0.0\grid\bin

O:\app\19.0.0\grid\bin>asmca.bat
```

In ASMCA, create the `RECO` disk group using the disk stamped as:

```text
ORCLDISKRECO01
```

![RECO](./screenshots/reco_1.png)
![RECO](./screenshots/reco_2.png)
![RECO](./screenshots/reco_3.png)
![RECO](./screenshots/reco_4.png)
![RECO](./screenshots/reco_5.png)

## Verify the Grid Infrastructure Configuration

After completing the Grid Infrastructure and ASM configuration, verify the Oracle resources.

Set the Grid Infrastructure environment:

```cmd
O:\app\19.0.0\grid\bin>set ORACLE_SID=+ASM

O:\app\19.0.0\grid\bin>set ORACLE_HOME=O:\app\19.0.0\grid

O:\app\19.0.0\grid\bin>set PATH=%ORACLE_HOME%\bin;%PATH%
```

Display the Oracle High Availability Services resources:

```cmd
O:\app\19.0.0\grid\bin>crsctl stat res -t
--------------------------------------------------------------------------------
Name           Target  State        Server                   State details
--------------------------------------------------------------------------------
Local Resources
--------------------------------------------------------------------------------
ora.DATA.dg
               ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.LISTENER.lsnr
               ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.RECO.dg
               ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.asm
               ONLINE  ONLINE       win-1r99np9hb5g          Started,STABLE
ora.ons
               OFFLINE OFFLINE      win-1r99np9hb5g          STABLE
--------------------------------------------------------------------------------
Cluster Resources
--------------------------------------------------------------------------------
ora.cssd
      1        ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.evmd
      1        ONLINE  ONLINE       win-1r99np9hb5g          STABLE
--------------------------------------------------------------------------------
```

Verify that the important Grid Infrastructure resources are online, including:

- `ora.DATA.dg`
- `ora.RECO.dg`
- `ora.asm`
- `ora.LISTENER.lsnr`

The Grid Infrastructure and ASM configuration is now complete.

## Install and Configure Oracle Database 19c

After completing the Oracle Grid Infrastructure and ASM configuration, install the Oracle Database 19c software.

## Create the Database Oracle Home

Create a separate Oracle Home for the Database software:

```cmd
C:\Users\oracle>mkdir O:\app\oracle\product\19.0.0\dbhome_1
```

The Database Oracle Home used in this environment is:

```text
O:\app\oracle\product\19.0.0\dbhome_1
```

## Extract the Oracle Database Software

Change to the directory containing the downloaded Oracle Database installation archive:

```cmd
C:\Users\oracle>cd Downloads
```

Verify the installation files:

```cmd
C:\Users\oracle\Downloads>dir
 Volume in drive C has no label.
 Volume Serial Number is A8A5-A452

 Directory of C:\Users\oracle\Downloads

08.11.2025  15:53     3 105 763 999 WINDOWS.X64_193000_db_home.zip
08.11.2025  15:53     2 181 665 470 WINDOWS.X64_193000_grid_home.zip
2 File(s)  5 287 429 469 bytes
2 Dir(s)  86 895 702 016 bytes free
```

Extract the Oracle Database archive directly into the Database Oracle Home:

```cmd
C:\Users\oracle\Downloads>tar -xf WINDOWS.X64_193000_db_home.zip -C O:\app\oracle\product\19.0.0\dbhome_1
```

## Install the Oracle Database Software

After extracting the software, open **Command Prompt as Administrator**.

Change to the Database Oracle Home:

```cmd
C:\Windows\system32>O:

O:\>cd O:\app\oracle\product\19.0.0\dbhome_1
```

Start Oracle Universal Installer:

```cmd
O:\app\oracle\product\19.0.0\dbhome_1>setup.exe
Launching Oracle Database Setup Wizard...
```

Complete the Oracle Database software installation using the installation wizard.

![Software](./screenshots/dbhome_1.png)
![Software](./screenshots/dbhome_2.png)
![Software](./screenshots/dbhome_3.png)
![Software](./screenshots/dbhome_4.png)
![Software](./screenshots/dbhome_5.png)
![Software](./screenshots/dbhome_6.png)
![Software](./screenshots/dbhome_7.png)
![Software](./screenshots/dbhome_8.png)
![Software](./screenshots/dbhome_9.png)

# Create and Configure the Oracle Database

After installing the Database software, use **Database Configuration Assistant (DBCA)** to create the database.

Open **Command Prompt as Administrator** and change to the Database Oracle Home `bin` directory:

```cmd
O:\app\oracle\product\19.0.0\dbhome_1>cd bin
```

Start DBCA:

```cmd
O:\app\oracle\product\19.0.0\dbhome_1\bin>dbca.bat
```

Use the DBCA wizard to create and configure the Oracle Database.

For this environment, the database is named:
```text
PROD
```

Configure the database to use the ASM disk groups created earlier for database and recovery storage.

![Home](./screenshots/win_db_1.png)
![Home](./screenshots/win_db_2.png)
![Home](./screenshots/win_db_3.png)
![Home](./screenshots/win_db_4.png)
![Home](./screenshots/win_db_5.png)
![Home](./screenshots/win_db_6.png)
![Home](./screenshots/win_db_7.png)
![Home](./screenshots/win_db_8.png)
![Home](./screenshots/win_db_9.png)
![Home](./screenshots/win_db_10.png)
![Home](./screenshots/win_db_net.png)
![Home](./screenshots/win_db_11.png)
![Home](./screenshots/win_db_12.png)
![Home](./screenshots/win_db_13.png)
![Home](./screenshots/win_db_14.png)
![Home](./screenshots/win_db_15.png)
![Home](./screenshots/win_db_16.png)
![Home](./screenshots/win_db_17.png)
![Home](./screenshots/win_db_18.png)

## Verify the Oracle Database Configuration

After creating the database, verify that the database and Grid Infrastructure resources are registered and online.

Set the Grid Infrastructure environment:

```cmd
C:\Users\oracle>set ORACLE_HOME=O:\app\19.0.0\grid

C:\Users\oracle>set ORACLE_SID=+ASM

C:\Users\oracle>set PATH=%ORACLE_HOME%\bin;%PATH%
```

Display the resource status:

```cmd
C:\Users\oracle>crsctl stat res -t
--------------------------------------------------------------------------------
Name           Target  State        Server                   State details
--------------------------------------------------------------------------------
Local Resources
--------------------------------------------------------------------------------
ora.DATA.dg
               ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.LISTENER.lsnr
               ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.RECO.dg
               ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.asm
               ONLINE  ONLINE       win-1r99np9hb5g          Started,STABLE
ora.ons
               OFFLINE OFFLINE      win-1r99np9hb5g          STABLE
--------------------------------------------------------------------------------
Cluster Resources
--------------------------------------------------------------------------------
ora.cssd
      1        ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.evmd
      1        ONLINE  ONLINE       win-1r99np9hb5g          STABLE
ora.prod.db
      1        ONLINE  ONLINE       win-1r99np9hb5g          Open,HOME=O:\app\ora
                                                             cle\product\19.0.0\d
                                                             bhome_1,STABLE
--------------------------------------------------------------------------------
```

The output confirms that the main Oracle resources are available:

- The `DATA` ASM disk group is online.
- The `RECO` ASM disk group is online.
- The ASM instance is online.
- The Oracle listener is online.
- The `PROD` database is online and open.

The following resource confirms that the database is registered and running:

```text
ora.prod.db
      1        ONLINE  ONLINE       win-1r99np9hb5g          Open,HOME=O:\app\ora
                                                             cle\product\19.0.0\d
                                                             bhome_1,STABLE
```

## Conclusion

The Oracle environment is now fully configured.

In this guide, we:

- Installed and prepared **Windows Server 2022**.
- Configured dedicated storage for Oracle software and ASM.
- Created an Oracle installation user.
- Installed **Oracle Grid Infrastructure 19c**.
- Prepared the ASM disks using `asmtool`.
- Configured the `DATA` and `RECO` ASM disk groups.
- Verified the Grid Infrastructure resources.
- Installed the **Oracle Database 19c** software.
- Created the `PROD` database using DBCA.
- Verified that the database, ASM disk groups, listener, and Grid Infrastructure resources are online.

The environment now provides a functional **Oracle Database 19c installation using Oracle Grid Infrastructure and ASM on Microsoft Windows Server 2022**.

