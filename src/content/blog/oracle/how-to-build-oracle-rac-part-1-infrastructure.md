
---
title: "Oracle RAC 19c from Scratch – Part 1: VirtualBox, DNS, Oracle Linux 10.2 and Shared Storage"
description: "Build a two-node Oracle RAC 19c laboratory using VirtualBox, Oracle Linux 10.2, BIND DNS, public and private networking, and shared ASM storage."
pubDate: 2026-11-01
tags:
  - Oracle RAC
  - Oracle Database 19c
  - Oracle Grid Infrastructure
  - Oracle Linux
  - VirtualBox
  - DNS
  - Oracle ASM
---

Oracle Real Application Clusters (Oracle RAC) allows multiple Oracle Database instances running on separate servers to access a single database.

Oracle RAC is commonly used in environments where high availability, scalability and service continuity are important requirements.

Unlike a standalone Oracle Database installation, Oracle RAC requires additional infrastructure components, including Oracle Clusterware, private interconnect networking, virtual IP addresses, Single Client Access Name (SCAN) resolution and shared storage.

Understanding and preparing these components before installing Oracle Grid Infrastructure is essential for building a functioning cluster.

This article is the first part of a series covering the installation and configuration of **Oracle RAC 19c from scratch using Oracle VM VirtualBox and Oracle Linux 10.2**.

The objective is to build a complete two-node Oracle RAC laboratory, beginning with the virtual infrastructure and continuing through Oracle Grid Infrastructure installation, Oracle ASM configuration, Oracle Database installation and cluster validation.

In this first part, the VirtualBox infrastructure and networking are prepared, a dedicated BIND DNS server is configured, both Oracle RAC nodes are installed with Oracle Linux 10.2, and five shared virtual disks are partitioned for Oracle ASM.

Oracle Grid Infrastructure, Oracle ASM disk groups, and Oracle RAC Database will be installed and configured in the next part of the series.

## Understanding Oracle Real Application Clusters

Oracle RAC is an Oracle Database architecture that allows multiple database instances to access the same database simultaneously.

Each instance runs on a separate server, known as a cluster node.

Although every instance has its own memory structures and background processes, the instances share the same database files.

Oracle Clusterware manages cluster membership and coordinates resources such as database instances, listeners, virtual IP addresses and services.

Oracle Automatic Storage Management (ASM) provides storage management for the database and, where configured, Oracle Clusterware files.

A typical two-node Oracle RAC environment consists of:

- Two Oracle RAC nodes.
- Oracle Grid Infrastructure and Oracle Clusterware.
- Oracle ASM shared storage.
- Public network connectivity.
- Private interconnect networking.
- Virtual IP addresses (VIPs).
- Single Client Access Name (SCAN).
- DNS name resolution.

The public network is used for client connectivity.

The private interconnect is used for communication between cluster nodes.

Shared storage allows both database instances to access the same database files.

Oracle documentation:

https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/

## Oracle RAC Lab Architecture

The laboratory consists of three virtual machines running on Oracle VM VirtualBox.

Two virtual machines serve as Oracle RAC nodes, while the third provides DNS services.

All three virtual machines are created and configured in this article. Oracle Grid Infrastructure, Oracle ASM disk groups, and Oracle Database will be installed in the next part of the series.

### Planned Virtual Machines

| Virtual machine | Hostname | Purpose |
|---|---|---|
| DNS server | `rac-dns` | DNS resolution for the RAC environment |
| RAC node 1 | `rac1` | First Oracle RAC node |
| RAC node 2 | `rac2` | Second Oracle RAC node |

### Planned Network Architecture

Oracle RAC requires separate public and private network connectivity.

For this laboratory, the following networks will be used:

| Network | Subnet | Purpose |
|---|---|---|
| Public network | `192.168.56.0/24` | DNS, public RAC addresses, VIPs and SCAN |
| Private network | `192.168.57.0/24` | Communication between RAC nodes |
| NAT network | VirtualBox-managed | Optional internet access for package installation |

The public and private networks must remain separate.

The private network will be configured on both RAC nodes later in this article.

The NAT connection is optional and will only be used for downloading packages and accessing external repositories.

## Hardware and Software Prerequisites

Before creating the environment, verify that the physical host has sufficient resources to run multiple virtual machines.

The following configuration is intended for a learning environment.

### Hardware Requirements

| Component | Recommended lab allocation |
|---|---|
| Physical host CPU | 8 logical processors or more |
| Physical host RAM | 32 GB or more |
| Physical host storage | 300 GB or more available |
| Virtualization support | Intel VT-x or AMD-V |
| Storage type | SSD recommended |

The actual resources required depend on the Oracle Database release, installed components and workload.

These values are a proposed laboratory configuration rather than Oracle's official minimum requirements.

### Software Requirements

| Software | Version |
|---|---|
| Oracle VM VirtualBox | 7.1 |
| DNS server operating system | Oracle Linux 10.2 |
| RAC node operating system | Oracle Linux 10.2 |
| Oracle Grid Infrastructure | 19c with a supported Release Update |
| Oracle Database | 19c Enterprise Edition with a supported Release Update |
| DNS software | BIND |

Before installing Oracle Grid Infrastructure, confirm that the selected Oracle Linux update, kernel and Oracle Grid Infrastructure release update are supported together.

Oracle documentation:

https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/

### Download Required Software

Download Oracle VM VirtualBox from Oracle:

https://www.oracle.com/virtualization/technologies/vm/downloads/virtualbox-downloads.html

Download Oracle Linux from Oracle:

https://yum.oracle.com/oracle-linux-isos.html

Oracle Database and Grid Infrastructure installation media are available through Oracle's software download channels.

https://www.oracle.com/database/technologies/oracle-database-software-downloads.html

For Part 1, only Oracle VM VirtualBox and the Oracle Linux installation ISO are required.

Oracle Grid Infrastructure and Oracle Database will be installed in the next article.

## Install Oracle VM VirtualBox

Oracle VM VirtualBox is a virtualization platform that allows multiple guest operating systems to run on a physical host.

In this environment, VirtualBox will host the DNS server and both Oracle RAC nodes.

Download the appropriate installation package for the physical host operating system.

Run the VirtualBox installer and complete the installation using the required networking components.

The exact installation screens depend on whether the physical host is running Windows, Linux or macOS.

After installation, open Oracle VM VirtualBox Manager.

Verify that VirtualBox starts successfully and that virtual machine creation is available.

Oracle documentation:

https://docs.oracle.com/en/virtualization/virtualbox/7.1/user/installation.html

## Configure VirtualBox Networking

Before creating the DNS server, configure the virtual network that will be used by the Oracle RAC environment.

Oracle VirtualBox supports several networking modes, including NAT, bridged networking, internal networking and host-only networking.

For this laboratory, we will use host-only networking for the public and private cluster networks.

Host-only networking allows the physical host and attached virtual machines to communicate without exposing the virtual network directly to the external physical network.

### Create the Public Host-Only Network

Open Oracle VM VirtualBox Manager.

Navigate to the network management interface.

Depending on the VirtualBox version and physical host operating system, this may be displayed under:

```text
File -> Tools -> Network Manager
```

Create a host-only network for the public RAC network.

Use the following addressing plan:

| Parameter | Value |
|---|---|
| Network | `192.168.56.0/24` |
| Host interface address | `192.168.56.1` |
| Subnet mask | `255.255.255.0` |
| DHCP | Disabled |

The address `192.168.56.1` is reserved for the VirtualBox host interface.

The DNS server and future RAC nodes will use other addresses from this subnet.

Disabling DHCP allows us to configure predictable static addresses for the laboratory.

### Create the Private Host-Only Network

Create a second host-only network.

| Parameter | Value |
|---|---|
| Network | `192.168.57.0/24` |
| Host interface address | `192.168.57.1` |
| Subnet mask | `255.255.255.0` |
| DHCP | Disabled |

This network will be used exclusively for communication between the RAC nodes.

The DNS server does not require an interface on the private network.

**Note:** The exact host-only network controls differ by VirtualBox release and host operating system. On recent macOS versions, VirtualBox uses host-only networks instead of legacy host-only adapters.

![RAC-DNS](../screenshots/rac-dns.png)

Oracle documentation:

https://docs.oracle.com/en/virtualization/virtualbox/7.1/user/networkingdetails.html

## Plan DNS Names and IP Addresses

Before installing the DNS server, define the names and addresses that will be used throughout the series.

The RAC nodes do not need to be installed yet.

We are only reserving their future addresses.

### Public Network Address Plan

| Hostname | IP address | Purpose |
|---|---|---|
| `rac-dns.raclab.test` | `192.168.56.10` | DNS server |
| `rac1.raclab.test` | `192.168.56.101` | RAC node 1 public address |
| `rac2.raclab.test` | `192.168.56.102` | RAC node 2 public address |
| `rac1-vip.raclab.test` | `192.168.56.111` | RAC node 1 virtual IP |
| `rac2-vip.raclab.test` | `192.168.56.112` | RAC node 2 virtual IP |
| `rac-scan.raclab.test` | `192.168.56.121` | SCAN address 1 |
| `rac-scan.raclab.test` | `192.168.56.122` | SCAN address 2 |
| `rac-scan.raclab.test` | `192.168.56.123` | SCAN address 3 |

The domain `raclab.test` is used only for this laboratory.

The `.test` domain is reserved for testing and avoids using a real production domain.

### Private Network Address Plan

| Hostname | IP address |
|---|---|
| `rac1-priv` | `192.168.57.101` |
| `rac2-priv` | `192.168.57.102` |

The private addresses will be configured during the RAC node installation later in this article.

They will not be added to the public DNS zone.

### Understanding SCAN

SCAN stands for Single Client Access Name.

It provides a single hostname that Oracle Database clients can use to connect to the cluster without specifying an individual RAC node.

Oracle recommends configuring SCAN to resolve to three IP addresses.

All SCAN addresses must belong to the same public subnet as the RAC node public and VIP addresses.

For this environment:

```text
rac-scan.raclab.test
```

will resolve to:

```text
192.168.56.121
192.168.56.122
192.168.56.123
```

These addresses must remain unused until Oracle Grid Infrastructure configures the SCAN resources.

The same principle applies to the RAC node VIP addresses.

Oracle documentation:

https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/ip-name-and-address-requirements-for-manual-configuration-of-cluster.html

## Create the DNS Virtual Machine

The first virtual machine to be installed is the DNS server.

This machine will provide name resolution for the Oracle RAC environment.

Open Oracle VM VirtualBox Manager and create a new virtual machine.

Use the following configuration:

| Parameter | Value |
|---|---|
| VM name | `rac-dns` |
| Operating system | Oracle Linux 10 |
| CPU | 1 vCPU |
| RAM | 2048 MB |
| Virtual disk | 20 GB |
| Disk format | VDI |
| Disk allocation | Dynamically allocated |

![RAC-DNS](../screenshots/dns1.png)
![RAC-DNS](../screenshots/dns2.png)
![RAC-DNS](../screenshots/dns3.png)
![RAC-DNS](../screenshots/dns4.png)

The DNS server does not require the same resources as an Oracle RAC node.

Its primary responsibility is to resolve hostnames and IP addresses.

### Configure the DNS VM Network Adapters

Open the virtual machine settings.

Configure the network adapters as follows:

| Adapter | Mode | Purpose |
|---|---|---|
| Adapter 1 | NAT | Internet access and package installation |
| Adapter 2 | Host-only | Public RAC network |

![RAC-DNS](../screenshots/dns5.png)
![RAC-DNS](../screenshots/dns6.png)

For Adapter 2, select the public host-only network created earlier.

The DNS server should not be connected to the private RAC network.

The virtual machine is now ready for operating-system installation.

## Install Oracle Linux 10 on the DNS Server

![RAC-DNS](../screenshots/dns7.png)
![RAC-DNS](../screenshots/dns8.png)
![RAC-DNS](../screenshots/dns9.png)
![RAC-DNS](../screenshots/dns10.png)
![RAC-DNS](../screenshots/dns11.png)
![RAC-DNS](../screenshots/dns12.png)
![RAC-DNS](../screenshots/dns13.png)
![RAC-DNS](../screenshots/dns14.png)
![RAC-DNS](../screenshots/dns15.png)
![RAC-DNS](../screenshots/dns16.png)
![RAC-DNS](../screenshots/dns17.png)

## Verify the Oracle Linux Installation

**Server: `rac-dns`**

Check the operating-system release:

```bash
root@rac-dns:~# cat /etc/oracle-release 
Oracle Linux Server release 10.2
```

Verify the hostname:

```bash
root@rac-dns:~# hostnamectl
 Static hostname: rac-dns.raclab.test
       Icon name: computer-vm
         Chassis: vm 🖴
      Machine ID: 4a978606eaaf41bb8755f870080b98f2
         Boot ID: 3f80874a3d5e4553bfee48794dced177
    Product UUID: f855ce08-08a3-394f-a01c-b471bf72405f
    AF_VSOCK CID: 1
  Virtualization: oracle
Operating System: Oracle Linux Server 10.2                       
     CPE OS Name: cpe:/o:oracle:linux:10:2:server
          Kernel: Linux 6.12.0-204.92.4.2.el10uek.x86_64
    Architecture: x86-64
 Hardware Vendor: innotek GmbH
  Hardware Model: VirtualBox
 Hardware Serial: VirtualBox-08ce55f8-a308-4f39-a01c-b471bf72405f
Firmware Version: VirtualBox
   Firmware Date: Fri 2006-12-01
    Firmware Age: 19y 11month    
```

If the hostname was not configured during installation, set it:

```bash
[root@rac-dns ~]# hostnamectl set-hostname rac-dns.raclab.test
```

## Configure the DNS Server Network

**Server: `rac-dns`**

The DNS server requires a static address on the public RAC network.

For this laboratory:

```text
IP address: 192.168.56.10
Subnet:     255.255.255.0
Domain:     raclab.test
```

The NAT adapter will provide outbound internet access.

The host-only adapter will provide connectivity to the future RAC nodes.

### Identify the Network Interfaces

Display the available network devices:

```bash
root@rac-dns:~# nmcli device status
DEVICE  TYPE      STATE                   CONNECTION 
enp0s3  ethernet  connected               enp0s3     
enp0s8  ethernet  connected               enp0s8     
lo      loopback  connected (externally)  lo     
```

Display the configured connections:

```bash
root@rac-dns:~# nmcli connection show
NAME    UUID                                  TYPE      DEVICE 
enp0s3  ad497f06-03d6-3738-9ad1-ffd000d65630  ethernet  enp0s3 
enp0s8  8bc25ebc-4ffc-322b-ae09-925bb4020a04  ethernet  enp0s8 
lo      56484c35-ab06-422e-8151-d63f751c1e9b  loopback  lo  
```

Check the current addresses:

```bash
root@rac-dns:~# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128 
enp0s3           UP             10.0.2.15/24 fd17:625c:f037:2:a00:27ff:fe6e:9e08/64 fe80::a00:27ff:fe6e:9e08/64 
enp0s8           UP             192.168.56.10/24 fe80::a00:27ff:fe6f:8c7a/64 
```

Interface names and connection names depend on the VirtualBox adapter configuration and Oracle Linux installation.


### Verify Network Connectivity

Test connectivity to the VirtualBox host-only interface:

```bash
root@rac-dns:~# ping -c 4 192.168.56.1
PING 192.168.56.1 (192.168.56.1) 56(84) bytes of data.
64 bytes from 192.168.56.1: icmp_seq=1 ttl=64 time=0.109 ms
64 bytes from 192.168.56.1: icmp_seq=2 ttl=64 time=0.088 ms
64 bytes from 192.168.56.1: icmp_seq=3 ttl=64 time=0.080 ms
64 bytes from 192.168.56.1: icmp_seq=4 ttl=64 time=0.149 ms

--- 192.168.56.1 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3133ms
rtt min/avg/max/mdev = 0.080/0.106/0.149/0.026 ms

```

If the host firewall permits ICMP, the command should receive responses.

A failed ping does not necessarily indicate a DNS problem, check the adapter assignment, host firewall and IP configuration.

Verify the routing table:

```bash
root@rac-dns:~# ip route
default via 10.0.2.2 dev enp0s3 proto dhcp src 10.0.2.15 metric 100 
10.0.2.0/24 dev enp0s3 proto kernel scope link src 10.0.2.15 metric 100 
192.168.56.0/24 dev enp0s8 proto kernel scope link src 192.168.56.10 metric 101 
```

The default route should normally use the NAT adapter if internet access is required.

The host-only connection should not replace the NAT default route.

## Install BIND DNS

**Server: `rac-dns`**

Oracle Linux provides the BIND DNS server through the `bind` package.

BIND is used to resolve hostnames into IP addresses and to provide reverse DNS resolution.

Install the required packages:

```bash
root@rac-dns:~# dnf install -y bind bind-utils
Oracle Linux 10 BaseOS Latest (x86_64)                                                                                                                                                                       38 MB/s |  83 MB     00:02    
Oracle Linux 10 Application Stream Packages (x86_64)                                                                                                                                                         23 MB/s | 6.1 MB     00:00    
Oracle Linux 10 UEK Release 8 (x86_64)                                                                                                                                                                       43 MB/s |  42 MB     00:00    
Last metadata expiration check: 0:00:01 ago on Sun 01 Nov 2026 02:00:41 PM CET.
Package bind-utils-32:9.18.33-15.0.1.el10_2.1.x86_64 is already installed.
Dependencies resolved.
============================================================================================================================================================================================================================================
 Package                                                   Architecture                                   Version                                                              Repository                                              Size
============================================================================================================================================================================================================================================
Installing:
 bind                                                      x86_64                                         32:9.18.33-15.0.1.el10_2.14                                          ol10_appstream                                         471 k
Upgrading:
 bind-libs                                                 x86_64                                         32:9.18.33-15.0.1.el10_2.14                                          ol10_appstream                                         1.4 M
 bind-license                                              noarch                                         32:9.18.33-15.0.1.el10_2.14                                          ol10_appstream                                         116 k
 bind-utils                                                x86_64                                         32:9.18.33-15.0.1.el10_2.14                                          ol10_appstream                                         350 k
Installing weak dependencies:
 bind-dnssec-utils                                         x86_64                                         32:9.18.33-15.0.1.el10_2.14                                          ol10_appstream                                         268 k

Transaction Summary
============================================================================================================================================================================================================================================
Install  2 Packages
Upgrade  3 Packages

Total download size: 2.6 M
Downloading Packages:
(1/5): bind-libs-9.18.33-15.0.1.el10_2.14.x86_64.rpm                                                                                                                                                         11 MB/s | 1.4 MB     00:00    
(2/5): bind-license-9.18.33-15.0.1.el10_2.14.noarch.rpm                                                                                                                                                     2.5 MB/s | 116 kB     00:00    
(3/5): bind-utils-9.18.33-15.0.1.el10_2.14.x86_64.rpm                                                                                                                                                       9.7 MB/s | 350 kB     00:00    
(4/5): bind-dnssec-utils-9.18.33-15.0.1.el10_2.14.x86_64.rpm                                                                                                                                                1.1 MB/s | 268 kB     00:00    
(5/5): bind-9.18.33-15.0.1.el10_2.14.x86_64.rpm                                                                                                                                                             1.7 MB/s | 471 kB     00:00    
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
Total                                                                                                                                                                                                       9.1 MB/s | 2.6 MB     00:00     
Oracle Linux 10 Application Stream Packages (x86_64)                                                                                                                                                        6.1 MB/s | 6.2 kB     00:00    
Importing GPG key 0x8D8B756F:
 Userid     : "Oracle Linux (release key 1) <secalert_us@oracle.com>"
 Fingerprint: 3E6D 826D 3FBA B389 C2F3 8E34 BC4D 06A0 8D8B 756F
 From       : /etc/pki/rpm-gpg/RPM-GPG-KEY-oracle
Key imported successfully
Importing GPG key 0x8B4EFBE6:
 Userid     : "Oracle Linux (backup key 1) <secalert_us@oracle.com>"
 Fingerprint: 9822 3175 9C74 6706 5D0C E9B2 A7DD 0708 8B4E FBE6
 From       : /etc/pki/rpm-gpg/RPM-GPG-KEY-oracle
Key imported successfully
Running transaction check
Transaction check succeeded.
Running transaction test
Transaction test succeeded.
Running transaction
  Preparing        :                                                                                                                                                                                                                    1/1 
  Upgrading        : bind-license-32:9.18.33-15.0.1.el10_2.14.noarch                                                                                                                                                                    1/8 
  Upgrading        : bind-libs-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                                                                                                                       2/8 
  Upgrading        : bind-utils-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                                                                                                                      3/8 
  Installing       : bind-dnssec-utils-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                                                                                                               4/8 
  Running scriptlet: bind-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                                                                                                                            5/8 
  Installing       : bind-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                                                                                                                            5/8 
  Running scriptlet: bind-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                                                                                                                            5/8 
  Cleanup          : bind-utils-32:9.18.33-15.0.1.el10_2.1.x86_64                                                                                                                                                                       6/8 
  Cleanup          : bind-libs-32:9.18.33-15.0.1.el10_2.1.x86_64                                                                                                                                                                        7/8 
  Cleanup          : bind-license-32:9.18.33-15.0.1.el10_2.1.noarch                                                                                                                                                                     8/8 
  Running scriptlet: bind-license-32:9.18.33-15.0.1.el10_2.1.noarch                                                                                                                                                                     8/8 

Upgraded:
  bind-libs-32:9.18.33-15.0.1.el10_2.14.x86_64                                 bind-license-32:9.18.33-15.0.1.el10_2.14.noarch                                 bind-utils-32:9.18.33-15.0.1.el10_2.14.x86_64                                
Installed:
  bind-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                        bind-dnssec-utils-32:9.18.33-15.0.1.el10_2.14.x86_64                                                                       

Complete!
```

The `bind` package provides the DNS server.

The `bind-utils` package provides utilities such as `dig` and `nslookup`.

Verify that the packages are installed:

```bash
root@rac-dns:~# rpm -q bind bind-utils
bind-9.18.33-15.0.1.el10_2.14.x86_64
bind-utils-9.18.33-15.0.1.el10_2.14.x86_64
```

Back up the original configuration file:

```bash
[root@rac-dns ~]# cp -a /etc/named.conf /etc/named.conf.bak
```

Oracle Linux documentation:

https://docs.oracle.com/en/operating-systems/oracle-linux/10/

## Configure the BIND DNS Server

**Server: `rac-dns`**

The main BIND configuration file is:

```text
/etc/named.conf
```

Open the configuration:

```bash
[root@rac-dns ~]# vi /etc/named.conf
```

Modify the existing `options` block so that BIND listens on the DNS server's public lab address.

For this isolated laboratory, the relevant configuration is:

```conf
options {
        listen-on port 53 { 127.0.0.1; 192.168.56.10; };
        listen-on-v6 port 53 { ::1; };
        directory       "/var/named";
        dump-file       "/var/named/data/cache_dump.db";
        statistics-file "/var/named/data/named_stats.txt";
        memstatistics-file "/var/named/data/named_mem_stats.txt";
        secroots-file   "/var/named/data/named.secroots";
        recursing-file  "/var/named/data/named.recursing";
        allow-query     { localhost; 192.168.56.0/24; };
...
...
...
};
```

This is the relevant options block for the lab. Preserve any additional required directives from the packaged Oracle Linux configuration, and do not create a second `options` block.

The `listen-on` directive defines the addresses on which BIND accepts DNS requests.

The `allow-query` directive limits DNS queries to the local machine and the public RAC laboratory network.

The `recursion no` directive makes this DNS server authoritative for the configured zones rather than a general-purpose recursive resolver.

### Configure the Forward DNS Zone

Add the following zone declaration to `/etc/named.conf`:

```conf
zone "raclab.test" IN {
    type master;
    file "raclab.test.zone";
    allow-update { none; };
};
```

This zone will contain the DNS records for the RAC public hostnames, VIP addresses and SCAN addresses.

### Configure the Reverse DNS Zone

Add the reverse zone declaration:

```conf
zone "56.168.192.in-addr.arpa" IN {
    type master;
    file "56.168.192.rev";
    allow-update { none; };
};
```

The reverse zone allows DNS queries to resolve public IP addresses back to hostnames.

## Create the Forward DNS Zone File

**Server: `rac-dns`**

Create the zone file:

```bash
[root@rac-dns ~]# vi /var/named/raclab.test.zone
```

Add the following configuration:

```dns
$TTL 3600

@ IN SOA rac-dns.raclab.test. admin.raclab.test. (
    2026110101
    3600
    900
    604800
    3600
)

@ IN NS rac-dns.raclab.test.

rac-dns   IN A 192.168.56.10

rac1      IN A 192.168.56.101
rac2      IN A 192.168.56.102

rac1-vip  IN A 192.168.56.111
rac2-vip  IN A 192.168.56.112

rac-scan  IN A 192.168.56.121
rac-scan  IN A 192.168.56.122
rac-scan  IN A 192.168.56.123
```

The forward zone contains the public Oracle RAC hostnames, VIP records, and SCAN records.

The `rac1` and `rac2` DNS entries are created before installing the RAC virtual machines so that hostname resolution is available during their configuration.

The VIP and SCAN addresses are also reserved in advance.

**Do not assign VIP or SCAN addresses manually to Linux network interfaces.**

Oracle Clusterware will manage these addresses after Grid Infrastructure installation.

The SOA serial number should be increased whenever the DNS zone is modified.

## Create the Reverse DNS Zone File

**Server: `rac-dns`**

Create the reverse zone:

```bash
[root@rac-dns ~]# vi /var/named/56.168.192.rev
```

Add the following configuration:

```dns
$TTL 3600

@ IN SOA rac-dns.raclab.test. admin.raclab.test. (
    2026110101
    3600
    900
    604800
    3600
)

@ IN NS rac-dns.raclab.test.

10  IN PTR rac-dns.raclab.test.

101 IN PTR rac1.raclab.test.
102 IN PTR rac2.raclab.test.

111 IN PTR rac1-vip.raclab.test.
112 IN PTR rac2-vip.raclab.test.

121 IN PTR rac-scan.raclab.test.
122 IN PTR rac-scan.raclab.test.
123 IN PTR rac-scan.raclab.test.
```

The reverse zone provides hostname lookup for addresses in the `192.168.56.0/24` network.

Private interconnect addresses are intentionally excluded from the public DNS zones.

## Configure DNS Zone File Permissions

**Server: `rac-dns`**

Set appropriate ownership:

```bash
[root@rac-dns ~]# chown root:named /var/named/raclab.test.zone
[root@rac-dns ~]# chown root:named /var/named/56.168.192.rev
```

Configure permissions:

```bash
[root@rac-dns ~]# chmod 640 /var/named/raclab.test.zone
[root@rac-dns ~]# chmod 640 /var/named/56.168.192.rev
```

Restore SELinux file contexts:

```bash
[root@rac-dns ~]# restorecon -v /var/named/raclab.test.zone
[root@rac-dns ~]# restorecon -v /var/named/56.168.192.rev
```

These permissions allow the DNS service to read the zone files.

## Validate the DNS Configuration

**Server: `rac-dns`**

Before starting BIND, validate the configuration.

Check the main configuration:

```bash
[root@rac-dns ~]# named-checkconf
```

If the configuration is valid, this command normally produces no output.

Validate the forward zone:

```bash
root@rac-dns:~# named-checkzone raclab.test /var/named/raclab.test.zone
zone raclab.test/IN: loaded serial 2026110101
OK
```

Validate the reverse zone:

```bash
root@rac-dns:~# named-checkzone 56.168.192.in-addr.arpa /var/named/56.168.192.rev
zone 56.168.192.in-addr.arpa/IN: loaded serial 2026110101
OK
```

Both zone checks should report successful loading.

Resolve any syntax errors before continuing.

## Configure the DNS Firewall

**Server: `rac-dns`**

DNS uses TCP and UDP port 53.

Oracle Linux uses `firewalld` to manage firewall rules in a typical installation.

Check the active firewall zones:

```bash
root@rac-dns:~# firewall-cmd --get-active-zones
public (default)
  interfaces: enp0s3 enp0s8
```

Identify the zone assigned to the public host-only interface.


```bash
root@rac-dns:~# firewall-cmd --permanent \
  --zone=public \
  --add-service=dns
success
```

Reload the firewall:

```bash
root@rac-dns:~# firewall-cmd --reload
success
```

Verify the DNS service is permitted:

```bash
root@rac-dns:~# firewall-cmd --zone=public --list-services
cockpit dhcpv6-client dns ssh
```

Avoid opening the DNS service unnecessarily on the NAT-facing interface.

## Start and Enable BIND

**Server: `rac-dns`**

Enable and start the DNS service:

```bash
root@rac-dns:~# systemctl enable --now named
Created symlink '/etc/systemd/system/multi-user.target.wants/named.service' → '/usr/lib/systemd/system/named.service'.
```

Check its status:

```bash
root@rac-dns:~# systemctl status named
● named.service - Berkeley Internet Name Domain (DNS)
     Loaded: loaded (/usr/lib/systemd/system/named.service; enabled; preset: disabled)
     Active: active (running) since Sun 2026-11-01 15:29:52 CET; 7s ago
 Invocation: 5084a759bdd64d13a89df0ebf7f96c9a
    Process: 5757 ExecStartPre=/bin/bash -c if [ ! "$DISABLE_ZONE_CHECKING" == "yes" ]; then /usr/bin/named-checkconf -z "$NAMEDCONF"; else echo "Checking of zone files is disabled"; fi (code=exited, status=0/SUCCESS)
    Process: 5760 ExecStart=/usr/sbin/named -u named -c ${NAMEDCONF} $OPTIONS (code=exited, status=0/SUCCESS)
   Main PID: 5761 (named)
      Tasks: 4 (limit: 9281)
     Memory: 4.9M (peak: 5.1M)
        CPU: 44ms
     CGroup: /system.slice/named.service
             └─5761 /usr/sbin/named -u named -c /etc/named.conf

Nov 01 15:29:52 rac-dns.raclab.test named[5761]: zone 1.0.0.127.in-addr.arpa/IN: loaded serial 0
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: zone 56.168.192.in-addr.arpa/IN: loaded serial 2026110101
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: zone raclab.test/IN: loaded serial 2026110101
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: zone localhost.localdomain/IN: loaded serial 0
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: zone localhost/IN: loaded serial 0
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: all zones loaded
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: running
Nov 01 15:29:52 rac-dns.raclab.test systemd[1]: Started named.service - Berkeley Internet Name Domain (DNS).
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: managed-keys-zone: Initializing automatic trust anchor management for zone '.'; DNSKEY ID 20326 is now trusted, waiving the normal 30-day waiting period.
Nov 01 15:29:52 rac-dns.raclab.test named[5761]: managed-keys-zone: Initializing automatic trust anchor management for zone '.'; DNSKEY ID 38696 is now trusted, waiving the normal 30-day waiting period.
```

Verify that the service is active:

```bash
root@rac-dns:~# systemctl is-active named
active
```

If the service fails to start, inspect the logs:

## Verify DNS Resolution

**Server: `rac-dns`**

The DNS server is now configured.

Test the records using `dig`.

### Verify the DNS Server Record

```bash
root@rac-dns:~# dig @192.168.56.10 rac-dns.raclab.test A +short
192.168.56.10
```

### Verify RAC Node Public Records

```bash
root@rac-dns:~# dig @192.168.56.10 rac1.raclab.test A +short
192.168.56.101
```

Check the second node:

```bash
root@rac-dns:~# dig @192.168.56.10 rac2.raclab.test A +short
192.168.56.102
```

These records should resolve even though the RAC node virtual machines have not yet been installed.

DNS resolution does not require the corresponding server to be online.

### Verify VIP Records

```bash
root@rac-dns:~# dig @192.168.56.10 rac1-vip.raclab.test A +short
192.168.56.111
```

Check the second VIP:

```bash
root@rac-dns:~# dig @192.168.56.10 rac2-vip.raclab.test A +short
192.168.56.112
```

### Verify SCAN Resolution

Check the SCAN hostname:

```bash
root@rac-dns:~# dig @192.168.56.10 rac-scan.raclab.test A +short
192.168.56.121
192.168.56.123
192.168.56.122
```

The order may vary between queries.

This is expected behavior.

Oracle recommends that a SCAN hostname resolve to three IP addresses for high availability and scalability.

### Verify Reverse DNS Resolution

Check the reverse DNS records for both RAC nodes:

```bash
[root@rac1 ~]# dig @192.168.56.10 -x 192.168.56.101 +short
rac1.raclab.test.
[root@rac1 ~]# dig @192.168.56.10 -x 192.168.56.102 +short
rac2.raclab.test.
```

These examples show the expected results from the configuration, not captured output from an executed installation.

## Understanding Shared Storage for Oracle RAC

Oracle RAC requires shared access to database storage.

In a typical RAC environment, Oracle ASM manages the shared disks used by the database and, where configured, Oracle Clusterware.

Both RAC nodes must be able to access the same underlying shared storage.

For this VirtualBox laboratory, five shareable VDI disks will simulate shared block storage.

The disks are created in this section and attached to both RAC nodes later in this article.

### Planned ASM Storage Layout

| Planned disk group | Disk | Size | Purpose |
|---|---|---|---|
| OCR | `asm-ocr01.vdi` | 10 GB | Planned cluster storage |
| OCR | `asm-ocr02.vdi` | 10 GB | Planned cluster storage |
| OCR | `asm-ocr03.vdi` | 10 GB | Planned cluster storage |
| DATA | `asm-data01.vdi` | 100 GB | Database files |
| FRA | `asm-fra01.vdi` | 50 GB | Fast Recovery Area |

These disk group names and sizes are illustrative.

The exact disk group configuration, redundancy level and OCR/voting file placement will be determined during Oracle Grid Infrastructure installation.

Creating three disks does not by itself establish ASM redundancy.

Oracle documentation:

https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/storage-considerations-for-oracle-grid-infrastructure-and-oracle-rac.html

## Create the Shared Virtual Disks

**Server: Physical VirtualBox host**

The following commands must be executed on the physical computer where Oracle VM VirtualBox is installed.

They must not be executed inside the DNS virtual machine.

Open a terminal or command prompt where `VBoxManage` is available.

Create a dedicated directory for shared disk images.

For example:

```text
rac-lab/
    shared-disks/
```

Navigate to the `shared-disks` directory.

### Create the OCR Candidate Disks

Create the first disk:

```bash
honey7@fedora:~/rac-lab/shared-disks$ VBoxManage createmedium disk \
  --filename "asm-ocr01.vdi" \
  --size 10240 \
  --format VDI \
  --variant Fixed
0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
```

Create the second disk:

```bash
honey7@fedora:~/rac-lab/shared-disks$ VBoxManage createmedium disk \
  --filename "asm-ocr02.vdi" \
  --size 10240 \
  --format VDI \
  --variant Fixed
0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
Medium created. UUID: d791c4b8-a8f4-4fc6-a9ec-216c58f077c2
```

Create the third disk:

```bash
honey7@fedora:~/rac-lab/shared-disks$ VBoxManage createmedium disk \
  --filename "asm-ocr03.vdi" \
  --size 10240 \
  --format VDI \
  --variant Fixed
0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
Medium created. UUID: e2f3baa6-bf9f-4d01-a9ec-c72cbb62a49d
```

Each disk has a logical capacity of 10 GB.

### Create the DATA Disk

Create the disk planned for database files:

```bash
honey7@fedora:~/rac-lab/shared-disks$ VBoxManage createmedium disk \
  --filename "asm-data01.vdi" \
  --size 102400 \
  --format VDI \
  --variant Fixed
0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
Medium created. UUID: c7feac04-2fd5-43a8-8a6c-c290c4d11e06
```

This creates a 100 GB virtual disk.

### Create the FRA Disk

Create the disk planned for the Fast Recovery Area:

```bash
honey7@fedora:~/rac-lab/shared-disks$ VBoxManage createmedium disk \
  --filename "asm-fra01.vdi" \
  --size 51200 \
  --format VDI \
  --variant Fixed
0%...10%...20%...30%...40%...50%...60%...70%...80%...90%...100%
Medium created. UUID: df2f71c2-d3c5-452e-8c79-07576f737b47
```

This creates a 50 GB virtual disk.

The shared disk images now exist on the physical host.

## Configure the Virtual Disks as Shareable

**Server: Physical VirtualBox host**

VirtualBox supports special disk image modes, including shareable media.

For the planned RAC laboratory, configure the shared disks as shareable.

Run the following command from the directory containing the VDI files:

```bash
honey7@fedora:~/rac-lab/shared-disks$ for disk in asm-ocr01 asm-ocr02 asm-ocr03 asm-data01 asm-fra01; do
  VBoxManage modifymedium disk "${disk}.vdi" --type shareable
done
```

Verify the disk information:

```bash
honey7@fedora:~/rac-lab/shared-disks$ for disk in asm-ocr01 asm-ocr02 asm-ocr03 asm-data01 asm-fra01; do
  VBoxManage showmediuminfo disk "${disk}.vdi" 
done
UUID:           76bae767-6173-4681-9bbb-357364ca62b7
Parent UUID:    base
State:          created
Type:           shareable
Location:       /home/honey7/rac-lab/shared-disks/asm-ocr01.vdi
Storage format: VDI
Format variant: fixed default
Capacity:       10240 MBytes
Size on disk:   10242 MBytes
Encryption:     disabled
Property:       AllocationBlockSize=1048576
UUID:           d791c4b8-a8f4-4fc6-a9ec-216c58f077c2
Parent UUID:    base
State:          created
Type:           shareable
Location:       /home/honey7/rac-lab/shared-disks/asm-ocr02.vdi
Storage format: VDI
Format variant: fixed default
Capacity:       10240 MBytes
Size on disk:   10242 MBytes
Encryption:     disabled
Property:       AllocationBlockSize=1048576
UUID:           e2f3baa6-bf9f-4d01-a9ec-c72cbb62a49d
Parent UUID:    base
State:          created
Type:           shareable
Location:       /home/honey7/rac-lab/shared-disks/asm-ocr03.vdi
Storage format: VDI
Format variant: fixed default
Capacity:       10240 MBytes
Size on disk:   10242 MBytes
Encryption:     disabled
Property:       AllocationBlockSize=1048576
UUID:           c7feac04-2fd5-43a8-8a6c-c290c4d11e06
Parent UUID:    base
State:          created
Type:           shareable
Location:       /home/honey7/rac-lab/shared-disks/asm-data01.vdi
Storage format: VDI
Format variant: fixed default
Capacity:       102400 MBytes
Size on disk:   102402 MBytes
Encryption:     disabled
Property:       AllocationBlockSize=1048576
UUID:           df2f71c2-d3c5-452e-8c79-07576f737b47
Parent UUID:    base
State:          created
Type:           shareable
Location:       /home/honey7/rac-lab/shared-disks/asm-fra01.vdi
Storage format: VDI
Format variant: fixed default
Capacity:       51200 MBytes
Size on disk:   51202 MBytes
Encryption:     disabled
Property:       AllocationBlockSize=1048576
```

The medium information should reflect the configured shareable disk type.

**Important:** These disk images are intended for a laboratory environment. Shared VDI disks in VirtualBox should not be treated as a certified production Oracle RAC storage solution.

Oracle documentation:

https://docs.oracle.com/en/virtualization/virtualbox/7.1/user/vboxmanage.html


## DNS and VirtualBox Infrastructure Checkpoint

Before creating the RAC nodes, verify that the DNS server, VirtualBox networks, and shared disk images are ready.

| Component | Verification | Expected result |
|---|---|---|
| VirtualBox | Open VirtualBox Manager | VirtualBox starts successfully |
| Public network | VirtualBox Network Manager | Public host-only network exists |
| Private network | VirtualBox Network Manager | Private host-only network exists |
| DNS VM | VirtualBox Manager | `rac-dns` exists |
| Oracle Linux | `cat /etc/oracle-release` | Oracle Linux 10.2 installed on the DNS server |
| DNS hostname | `hostname` | `rac-dns.raclab.test` |
| DNS address | `ip -br address` | `192.168.56.10` configured |
| BIND service | `systemctl is-active named` | `active` |
| Public DNS | `dig` | Planned public names resolve |
| VIP DNS | `dig` | Both VIP names resolve |
| SCAN DNS | `dig` | Three SCAN addresses returned |
| Shared disks | `VBoxManage list hdds` | All five disk images exist |

## Preparing the Oracle RAC Nodes

Both nodes will run Oracle Linux 10.2 and use separate public and private networks.

The public network provides communication between the RAC nodes, the DNS server, and database clients. The private network provides the dedicated interconnect required for Oracle Clusterware and Oracle RAC.

This section covers:

1. Creating the two RAC virtual machines.
2. Configuring the VirtualBox network adapters.
3. Installing Oracle Linux 10.2 on both nodes.
4. Assigning static public and private IP addresses.
5. Verifying hostnames, DNS resolution, and network connectivity.
6. Reviewing time synchronization, firewall, and SELinux settings.
7. Attaching the five shared virtual disks.
8. Identifying and partitioning the shared disks for Oracle ASM.
9. Performing the final infrastructure verification.

Oracle Grid Infrastructure, ASM disk groups, and Oracle Database will be configured in the next article. Release-specific installation prerequisites must be validated before beginning that installation.

> **Compatibility note:** Oracle Database 19c support for Oracle Linux 10 begins with the appropriate 19c Release Update, rather than the original 19.3 software alone. Before installing Grid Infrastructure, verify the exact Oracle Linux 10.2, kernel, Grid Infrastructure RU, and Database RU combination against Oracle's current documentation and My Oracle Support certification information. Oracle Linux 10 support begins at the 19.32 RU baseline; use an appropriate current RU and follow Oracle's documented installation-time patching procedure.

Official documentation:

- [Oracle Grid Infrastructure 19c Installation and Upgrade Guide for Linux](https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/)
- [Supported Oracle Linux 10 Distributions](https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/supported-oracle-linux-10-distributions-for-x86-64.html)
- [Oracle Database 19c Installation on Oracle Linux 10](https://docs.oracle.com/en/database/oracle/oracle-database/19/rnrdm/installing-oracle-database-19c-oracle-linux-10-and-red-hat-enterprise-linux-10.html)

---

## 1. Oracle RAC Node Architecture

The laboratory uses two RAC nodes connected to the same public and private networks.

The DNS server configured earlier remains available at `192.168.56.10`.

### Virtual Machine Configuration

| Parameter | RAC1 | RAC2 |
|---|---|---|
| Virtual machine name | `rac1` | `rac2` |
| Hostname | `rac1.raclab.test` | `rac2.raclab.test` |
| Operating system | Oracle Linux 10.2 | Oracle Linux 10.2 |
| Memory | 12 GB | 12 GB |
| Processors | 4 vCPUs | 4 vCPUs |
| Operating-system disk | 100 GB | 100 GB |
| Public IP | `192.168.56.101` | `192.168.56.102` |
| Private IP | `192.168.57.101` | `192.168.57.102` |
| VIP | `192.168.56.111` | `192.168.56.112` |
| DNS server | `192.168.56.10` | `192.168.56.10` |

The virtual machine resource allocations are intended for a laboratory environment. Actual requirements depend on the Grid Infrastructure installation options, database workload, and available host resources.

### Network Address Plan

| Component | Hostname | IP address |
|---|---|---|
| DNS server | `rac-dns.raclab.test` | `192.168.56.10` |
| RAC1 public | `rac1.raclab.test` | `192.168.56.101` |
| RAC2 public | `rac2.raclab.test` | `192.168.56.102` |
| RAC1 VIP | `rac1-vip.raclab.test` | `192.168.56.111` |
| RAC2 VIP | `rac2-vip.raclab.test` | `192.168.56.112` |
| SCAN | `rac-scan.raclab.test` | `192.168.56.121` |
| SCAN | `rac-scan.raclab.test` | `192.168.56.122` |
| SCAN | `rac-scan.raclab.test` | `192.168.56.123` |
| RAC1 private | `rac1-priv` | `192.168.57.101` |
| RAC2 private | `rac2-priv` | `192.168.57.102` |

The VIP and SCAN addresses have already been registered in DNS.

**They must not be manually configured on either RAC node.** Oracle Clusterware will manage these addresses during Grid Infrastructure installation.

The private interconnect addresses are configured directly on the Linux network interfaces. Publishing the private hostnames in public DNS is not required for this laboratory.

---

## 2. Creating the Oracle RAC Virtual Machines

**Location: Physical host running Oracle VM VirtualBox**

Open Oracle VM VirtualBox Manager.

Select **New** to create the first RAC virtual machine.

### RAC1 Virtual Machine

Configure the following values:

| Setting | Value |
|---|---|
| Name | `rac1` |
| Operating system | Oracle Linux |
| ISO image | Oracle Linux 10.2 installation ISO |
| Memory | 12GB |
| Processors | 4 |
| Virtual hard disk | 100 GB |
| Disk format | VDI |

Create the virtual machine with its own operating-system disk.

A dynamically allocated VDI is sufficient for the operating-system disk.

The shared ASM disks created previously must not be used as operating-system disks.

![RAC-VM](../screenshots/rac1.png)
![RAC-VM](../screenshots/rac2.png)
![RAC-VM](../screenshots/rac3.png)
![RAC-VM](../screenshots/rac4.png)

### RAC2 Virtual Machine

Repeat the procedure for the second virtual machine.

Use:

```text
Name: rac2
Memory: 12 GB
Processors: 4
Operating-system disk: 100 GB
```

Attach the same Oracle Linux 10.2 installation ISO.

Both virtual machines must have separate operating-system disks.

---

## 3. Configuring the VirtualBox Network Adapters

**Location: Physical VirtualBox host**

Before starting the Oracle Linux installation, configure three network adapters on each RAC virtual machine.

### Adapter Configuration

| Adapter | Attachment | Purpose |
|---|---|---|
| Adapter 1 | NAT | Internet access |
| Adapter 2 | Host-only Adapter | Public RAC network |
| Adapter 3 | Host-only Adapter | Private RAC interconnect |

The public host-only network uses:

```text
192.168.56.0/24
```

The private host-only network uses:

```text
192.168.57.0/24
```

The public and private adapters must be connected to different VirtualBox host-only networks.

For each virtual machine:

1. Open **Settings → Network**.
2. Enable **Adapter 1** and select **NAT**.
3. Enable **Adapter 2** and select the public host-only network.
4. Enable **Adapter 3** and select the private host-only network.
5. Ensure that **Cable Connected** is enabled for each adapter.

![VM-Network](../screenshots/rac8.png)
![VM-Network](../screenshots/rac9.png)
![VM-Network](../screenshots/rac10.png)

Use the same adapter arrangement for both RAC nodes.

### Expected Linux Interface Names

With this adapter order, the interfaces will commonly appear as:

| Interface | Purpose |
|---|---|
| `enp0s3` | NAT |
| `enp0s8` | Public |
| `enp0s9` | Private |

The actual interface names depend on the virtual hardware configuration.

Always verify the interface names in the Oracle Linux installer before assigning addresses.

---

## 4. Installing Oracle Linux 10.2

The Oracle Linux 10.2 installation procedure is identical for both RAC nodes.

The following screenshots demonstrate the complete graphical installation of RAC1, including installation destination, software selection, hostname configuration, network interfaces, and other installation settings.

RAC2 follows the same procedure, with only the hostname and static public and private IP addresses changed.

### 4.1 Installing Oracle Linux 10.2

Start the `rac1` virtual machine and boot from the Oracle Linux 10.2 installation ISO.

Select the graphical installation option and complete the installation using the settings illustrated in the following screenshots.

Select the **100 GB operating-system disk** as the installation destination. The shared ASM disks must not be selected.

Choose a graphical installation environment suitable for the Oracle RAC laboratory.

Configure the hostname and network interfaces during installation.

![VM-RAC](../screenshots/racvm1.png)
![VM-RAC](../screenshots/racvm2.png)
![VM-RAC](../screenshots/racvm3.png)
![VM-RAC](../screenshots/racvm4.png)
![VM-RAC](../screenshots/racvm5.png)
![VM-RAC](../screenshots/racvm6.png)
![VM-RAC](../screenshots/racvm7.png)
![VM-RAC](../screenshots/racvm8.png)
![VM-RAC](../screenshots/racvm9.png)
![VM-RAC](../screenshots/racvm10.png)
![VM-RAC](../screenshots/racvm11.png)
![VM-RAC](../screenshots/racvm12.png)
![VM-RAC](../screenshots/racvm13.png)
![VM-RAC](../screenshots/racvm14.png)

### 4.2 RAC1 and RAC2 Hostname and Network Configuration

Both RAC nodes use three network interfaces:

- `enp0s3` — NAT interface, configured using DHCP for internet connectivity.
- `enp0s8` — Public network, configured with a static IP address.
- `enp0s9` — Private network, configured with a static IP address for the Oracle RAC interconnect.

The following table summarizes the configuration for both nodes:

| Setting | RAC1 | RAC2 |
|---|---|---|
| Hostname | `rac1.raclab.test` | `rac2.raclab.test` |
| NAT (`enp0s3`) | DHCP | DHCP |
| Public IP (`enp0s8`) | `192.168.56.101/24` | `192.168.56.102/24` |
| Private IP (`enp0s9`) | `192.168.57.101/24` | `192.168.57.102/24` |
| DNS server | `192.168.56.10` | `192.168.56.10` |
| Search domain | `raclab.test` | `raclab.test` |
| Public gateway | None | None |
| Private gateway | None | None |

The NAT interface obtains its default gateway through DHCP.

The public interface uses the laboratory DNS server at `192.168.56.10`.

The private interface does not require a gateway or DNS server.

The interface names may differ depending on the virtual hardware configuration and should be verified during installation.

> **DNS consideration:** The laboratory DNS server is authoritative for `raclab.test` and has recursion disabled. External DNS resolution required for operating-system updates must be configured separately and verified after installation.

### 4.3 Installing RAC2

Repeat the same installation procedure for RAC2.

**All installation settings remain identical to RAC1, except for the following values:**

- Hostname: `rac2.raclab.test`
- Public IP address: `192.168.56.102/24`
- Private IP address: `192.168.57.102/24`

The DNS server remains `192.168.56.10`, and the NAT interface continues to use DHCP.

The installation screenshots are not repeated because the procedure is identical on both nodes.

### 4.4 Completing the Installation

Complete the remaining installer settings and begin the installation.

After the installation finishes, reboot each virtual machine and remove the installation ISO if necessary.

Once Oracle Linux 10.2 is installed on both RAC nodes, the next step is to update the operating systems and verify the network and DNS configuration before preparing the Oracle Grid Infrastructure prerequisites.


## 5. Updating Oracle Linux 10.2

**Servers: RAC1 and RAC2**

Before installing Oracle Grid Infrastructure, both RAC nodes should be updated to the intended Oracle Linux 10.2 package and kernel levels.

Verify that the configured repositories are accessible:

```bash
[root@rac1 ~]# dnf repolist --enabled
repo id                                                                                              repo name
ol10_UEKR8                                                                                           Oracle Linux 10 UEK Release 8 (x86_64)
ol10_appstream                                                                                       Oracle Linux 10 Application Stream Packages (x86_64)
ol10_baseos_latest                                                                                   Oracle Linux 10 BaseOS Latest (x86_64)
```

Update the installed packages:

```bash
[root@rac1 ~]# dnf update -y
```

Reboot each node after the update:

```bash
[root@rac1 ~]# reboot
```

Log in to both nodes.

### Verify the Operating-System Version

```bash
[root@rac1 ~]# cat /etc/oracle-release 
Oracle Linux Server release 10.2

[root@rac2 ~]# cat /etc/oracle-release 
Oracle Linux Server release 10.2
```

### Verify the Kernel

```bash
[root@rac1 ~]# uname -r
6.12.0-208.112.5.el10uek.x86_64

[root@rac2 ~]# uname -r
6.12.0-208.112.5.el10uek.x86_64
```

Compare the installed kernel with Oracle's documented minimum supported kernel for Oracle Linux 10.

Both nodes should run the same supported kernel version.

### Verify the Hostname

On RAC1:

```bash
[root@rac1 ~]# hostnamectl
 Static hostname: rac1.raclab.test
       Icon name: computer-vm
         Chassis: vm 🖴
      Machine ID: e2cb7aa919a24ab085720c8534a325c3
         Boot ID: d2f02cd9119e4e4d905af490210abaa7
    Product UUID: 169a4436-2222-6845-8de9-3482ae7e6762
    AF_VSOCK CID: 1
  Virtualization: oracle
Operating System: Oracle Linux Server 10.2                       
     CPE OS Name: cpe:/o:oracle:linux:10:2:server
          Kernel: Linux 6.12.0-208.112.5.el10uek.x86_64
    Architecture: x86-64
 Hardware Vendor: innotek GmbH
  Hardware Model: VirtualBox
 Hardware Serial: VirtualBox-36449a16-2222-4568-8de9-3482ae7e6762
Firmware Version: VirtualBox
   Firmware Date: Fri 2006-12-01
    Firmware Age: 19y 11month 1d                                 
[root@rac1 ~]# hostname -f
rac1.raclab.test
```


On RAC2:

```bash
[root@rac2 ~]# hostnamectl
 Static hostname: rac2.raclab.test
       Icon name: computer-vm
         Chassis: vm 🖴
      Machine ID: e4444f9a8b954c0b9e4dca6b651bd249
         Boot ID: d47abce4d9b24ae48e6d3bc772a5cdc1
    Product UUID: 95633dcd-720a-9a4f-a68b-740c2338e207
    AF_VSOCK CID: 1
  Virtualization: oracle
Operating System: Oracle Linux Server 10.2                       
     CPE OS Name: cpe:/o:oracle:linux:10:2:server
          Kernel: Linux 6.12.0-208.112.5.el10uek.x86_64
    Architecture: x86-64
 Hardware Vendor: innotek GmbH
  Hardware Model: VirtualBox
 Hardware Serial: VirtualBox-cd3d6395-0a72-4f9a-a68b-740c2338e207
Firmware Version: VirtualBox
   Firmware Date: Fri 2006-12-01
    Firmware Age: 19y 11month 1d                                 
[root@rac2 ~]# hostname -f
rac2.raclab.test

```

---

## 6. Verifying the Network Configuration

The relevant addresses on RAC1 should be:

```text
[root@rac1 ~]# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128 
enp0s3           UP             10.0.2.15/24 fd17:625c:f037:2:a00:27ff:fe87:b5a8/64 fe80::a00:27ff:fe87:b5a8/64 
enp0s8           UP             192.168.56.101/24 fe80::a00:27ff:fe64:98bc/64 
enp0s9           UP             192.168.57.101/24 fe80::a00:27ff:feb8:80f6/64 

```

On RAC2:

```text
[root@rac2 ~]# ip -br addr
lo               UNKNOWN        127.0.0.1/8 ::1/128 
enp0s3           UP             10.0.2.15/24 fd17:625c:f037:2:a00:27ff:fe66:31af/64 fe80::a00:27ff:fe66:31af/64 
enp0s8           UP             192.168.56.102/24 fe80::a00:27ff:fe5a:1720/64 
enp0s9           UP             192.168.57.102/24 fe80::a00:27ff:feda:c81f/64 
```

The exact output can include additional IPv6 addresses or other interface details.

### Verify the Routing Table

```bash
[root@rac1 ~]# ip route
default via 10.0.2.2 dev enp0s3 proto dhcp src 10.0.2.15 metric 100 
10.0.2.0/24 dev enp0s3 proto kernel scope link src 10.0.2.15 metric 100 
192.168.56.0/24 dev enp0s8 proto kernel scope link src 192.168.56.101 metric 101 
192.168.57.0/24 dev enp0s9 proto kernel scope link src 192.168.57.101 metric 102 
```

If NAT is enabled, the default route should normally use the NAT interface.

The private interconnect must not be configured as the default route.


## 7. Verifying DNS Resolution

The DNS server was configured earlier with the forward zone:

```text
raclab.test
```

And the reverse zone:

```text
56.168.192.in-addr.arpa
```

Both RAC nodes must resolve the public hostnames, VIP hostnames, and SCAN hostname correctly.

### 7.1 Verify the System Resolver

```bash
[root@rac1 ~]# cat /etc/resolv.conf
# Generated by NetworkManager
search telekom.ip raclab.test
nameserver 10.0.2.3
nameserver fd17:625c:f037:2::3
nameserver 192.168.56.10
```

Depending on the NetworkManager configuration, additional resolver entries may appear.

For this laboratory, the authoritative DNS server should be used consistently for the RAC domain.

### 7.2 Verify the DNS Server

Run:

```bash
[root@rac1 ~]# dig @192.168.56.10 rac-dns.raclab.test A +short
192.168.56.10
```

### 7.3 Verify Public Hostname Resolution

```bash
[root@rac1 ~]# dig @192.168.56.10 rac1.raclab.test A +short
192.168.56.101
[root@rac1 ~]# dig @192.168.56.10 rac2.raclab.test A +short
192.168.56.102
```

### 7.4 Verify VIP Resolution

```bash
[root@rac1 ~]# dig @192.168.56.10 rac1-vip.raclab.test A +short
192.168.56.111
[root@rac1 ~]# dig @192.168.56.10 rac2-vip.raclab.test A +short
192.168.56.112
```

These addresses must remain unassigned until Oracle Clusterware configures the VIP resources.

### 7.5 Verify SCAN Resolution

```bash
[root@rac1 ~]# dig @192.168.56.10 rac-scan.raclab.test A +short
192.168.56.123
192.168.56.122
192.168.56.121
```

The record order can vary.

The three SCAN IP addresses must be reserved and available on the public subnet.

Oracle recommends using DNS to resolve SCAN to three addresses for a standard manually configured RAC environment.

### 7.6 Verify Reverse DNS

Check RAC1:

```bash
[root@rac1 ~]# dig @192.168.56.10 -x 192.168.56.101 +short
rac1.raclab.test.
```

Check RAC2:

```bash
[root@rac2 ~]# dig @192.168.56.10 -x 192.168.56.102 +short
rac2.raclab.test.
```

The trailing dot indicates an absolute fully qualified DNS name.

Reverse DNS is useful for diagnostics and consistent hostname resolution. It should not be described as an unconditional requirement for every Oracle RAC installation.

---

## 8. Verifying Public and Private Network Connectivity

Both RAC nodes must communicate over the public and private networks.

### From RAC1

Test RAC2's public IP:

```bash
[root@rac1 ~]# ping -c 4 192.168.56.102
PING 192.168.56.102 (192.168.56.102) 56(84) bytes of data.
64 bytes from 192.168.56.102: icmp_seq=1 ttl=64 time=0.352 ms
64 bytes from 192.168.56.102: icmp_seq=2 ttl=64 time=0.261 ms
64 bytes from 192.168.56.102: icmp_seq=3 ttl=64 time=0.222 ms
64 bytes from 192.168.56.102: icmp_seq=4 ttl=64 time=0.264 ms

--- 192.168.56.102 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 10191ms
rtt min/avg/max/mdev = 0.222/0.274/0.352/0.047 ms
```

Test RAC2's private IP:

```bash
root@rac1 ~]# ping -c 4 192.168.57.102
PING 192.168.57.102 (192.168.57.102) 56(84) bytes of data.
64 bytes from 192.168.57.102: icmp_seq=1 ttl=64 time=0.398 ms
64 bytes from 192.168.57.102: icmp_seq=2 ttl=64 time=0.291 ms
64 bytes from 192.168.57.102: icmp_seq=3 ttl=64 time=0.261 ms
64 bytes from 192.168.57.102: icmp_seq=4 ttl=64 time=0.233 ms

--- 192.168.57.102 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3091ms
rtt min/avg/max/mdev = 0.233/0.295/0.398/0.062 ms
```

Test the DNS server:

```bash
[root@rac1 ~]# ping -c 4 192.168.56.101
PING 192.168.56.101 (192.168.56.101) 56(84) bytes of data.
64 bytes from 192.168.56.101: icmp_seq=1 ttl=64 time=0.034 ms
64 bytes from 192.168.56.101: icmp_seq=2 ttl=64 time=0.028 ms
64 bytes from 192.168.56.101: icmp_seq=3 ttl=64 time=0.050 ms
64 bytes from 192.168.56.101: icmp_seq=4 ttl=64 time=0.051 ms

--- 192.168.56.101 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3780ms
rtt min/avg/max/mdev = 0.028/0.040/0.051/0.010 ms
```

### From RAC2

Test RAC1's public IP:

```bash
[root@rac2 ~]# ping -c 4 192.168.56.101
PING 192.168.56.101 (192.168.56.101) 56(84) bytes of data.
64 bytes from 192.168.56.101: icmp_seq=1 ttl=64 time=0.252 ms
64 bytes from 192.168.56.101: icmp_seq=2 ttl=64 time=0.277 ms
64 bytes from 192.168.56.101: icmp_seq=3 ttl=64 time=0.301 ms
64 bytes from 192.168.56.101: icmp_seq=4 ttl=64 time=0.328 ms

--- 192.168.56.101 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3307ms
rtt min/avg/max/mdev = 0.252/0.289/0.328/0.028 ms
```

Test RAC1's private IP:

```bash
[root@rac2 ~]# ping -c 4 192.168.57.101
PING 192.168.57.101 (192.168.57.101) 56(84) bytes of data.
64 bytes from 192.168.57.101: icmp_seq=1 ttl=64 time=0.239 ms
64 bytes from 192.168.57.101: icmp_seq=2 ttl=64 time=0.261 ms
64 bytes from 192.168.57.101: icmp_seq=3 ttl=64 time=0.258 ms
64 bytes from 192.168.57.101: icmp_seq=4 ttl=64 time=0.304 ms

--- 192.168.57.101 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3023ms
rtt min/avg/max/mdev = 0.239/0.265/0.304/0.023 ms
```

Test the DNS server:

```bash
[root@rac2 ~]# ping -c 4 192.168.56.10
PING 192.168.56.10 (192.168.56.10) 56(84) bytes of data.
64 bytes from 192.168.56.10: icmp_seq=1 ttl=64 time=0.241 ms
64 bytes from 192.168.56.10: icmp_seq=2 ttl=64 time=0.293 ms
64 bytes from 192.168.56.10: icmp_seq=3 ttl=64 time=0.285 ms
64 bytes from 192.168.56.10: icmp_seq=4 ttl=64 time=0.247 ms

--- 192.168.56.10 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 15213ms
rtt min/avg/max/mdev = 0.241/0.266/0.293/0.022 ms
```

Successful communication confirms basic IP connectivity.

Additional Grid Infrastructure checks will validate the network configuration and cluster communication requirements.

Do not use the reserved VIP or SCAN addresses as ordinary connectivity tests before Clusterware installation. They are expected to be unassigned at this stage.

---

## 9. Configuring Time Synchronization

Oracle RAC requires consistent time across cluster nodes.

Oracle Linux 10 uses `chronyd` for time synchronization.

Check the service:

```bash
[root@rac1 ~]# systemctl status chronyd
● chronyd.service - NTP client/server
     Loaded: loaded (/usr/lib/systemd/system/chronyd.service; enabled; preset: enabled)
     Active: active (running) since Wed 2026-11-04 23:26:54 CET; 1min 47s ago
 Invocation: 83db4749b48b40be9cb190b8e748e644
       Docs: man:chronyd(8)
             man:chrony.conf(5)
   Main PID: 1275 (chronyd)
      Tasks: 1 (limit: 72901)
     Memory: 1.3M (peak: 3M)
        CPU: 41ms
     CGroup: /system.slice/chronyd.service
             └─1275 /usr/sbin/chronyd -n -F 2

Nov 04 23:26:54 rac1.raclab.test systemd[1]: Starting chronyd.service - NTP client/server...
Nov 04 23:26:54 rac1.raclab.test chronyd[1275]: chronyd version 4.8 starting (+CMDMON +REFCLOCK +RTC +PRIVDROP +SCFILTER +SIGND +NTS +SECHASH +IPV6 +DEBUG)
Nov 04 23:26:54 rac1.raclab.test chronyd[1275]: Frequency -33441.262 +/- 4.149 ppm read from /var/lib/chrony/drift
Nov 04 23:26:54 rac1.raclab.test chronyd[1275]: Loaded seccomp filter (level 2)
Nov 04 23:26:54 rac1.raclab.test systemd[1]: Started chronyd.service - NTP client/server.
Nov 04 23:26:59 rac1.raclab.test chronyd[1275]: Selected source 37.252.189.117 (2.pool.ntp.org)
```

```bash
[root@rac1 ~]# chronyc tracking
Reference ID    : 00000000 ()
Stratum         : 0
Ref time (UTC)  : Thu Jan 01 00:00:00 1970
System time     : 0.000000000 seconds slow of NTP time
Last offset     : -0.000225410 seconds
RMS offset      : 1.394946575 seconds
Frequency       : 32943.988 ppm slow
Residual freq   : +0.000 ppm
Skew            : 0.000 ppm
Root delay      : 1.000000000 seconds
Root dispersion : 1.000000000 seconds
Update interval : 0.0 seconds
Leap status     : Not synchronised
```

Display the configured time sources:

```bash
[root@rac2 ~]# chronyc sources -v

  .-- Source mode  '^' = server, '=' = peer, '#' = local clock.
 / .- Source state '*' = current best, '+' = combined, '-' = not combined,
| /             'x' = may be in error, '~' = too variable, '?' = unusable.
||                                                 .- xxxx [ yyyy ] +/- zzzz
||      Reachability register (octal) -.           |  xxxx = adjusted offset,
||      Log2(Polling interval) --.      |          |  yyyy = measured offset,
||                                \     |          |  zzzz = estimated error.
||                                 |    |           \
MS Name/IP address         Stratum Poll Reach LastRx Last sample               
===============================================================================
^? 217.175.198.239               0   6   377     -     +0ns[   +0ns] +/-    0ns
^? ntp1-vie-at.alwyzon.net       0   6   377     -     +0ns[   +0ns] +/-    0ns
^? fetchmail.mediainvent.at      0   6   377     -     +0ns[   +0ns] +/-    0ns
^? 37.252.189.117                0   6   377     -     +0ns[   +0ns] +/-    0ns
```
```bash
[root@rac1 ~]# timedatectl status
               Local time: Wed 2026-11-04 23:17:55 CET
           Universal time: Wed 2026-11-04 22:17:55 UTC
                 RTC time: Wed 2026-11-04 22:14:06
                Time zone: Europe/Vienna (CET, +0100)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

Both RAC nodes should use consistent, reachable time sources.

If the laboratory is isolated from the internet, provide an appropriate local time source or use a supported Oracle Cluster Time Synchronization Service configuration.

Do not assume that a running `chronyd` process means the clock is synchronized.

Check the actual synchronization status before Grid Infrastructure installation.

The final results should show a synchronized clock and an appropriate selected time source.

---

## 10. Reviewing Firewall and SELinux Settings

The RAC nodes must permit communication required by Oracle Clusterware, Oracle ASM, and Oracle Database.

Check the firewall:

```bash
[root@rac1 ~]# systemctl status firewalld
● firewalld.service - firewalld - dynamic firewall daemon
     Loaded: loaded (/usr/lib/systemd/system/firewalld.service; enabled; preset: enabled)
     Active: active (running) since Mon 2026-11-02 07:31:33 CET; 30min ago
 Invocation: 8afb7ed5d6904d0aae1003b5b1b4f7da
       Docs: man:firewalld(1)
   Main PID: 1024 (firewalld)
      Tasks: 2 (limit: 72883)
     Memory: 43.5M (peak: 45.5M)
        CPU: 421ms
     CGroup: /system.slice/firewalld.service
             └─1024 /usr/bin/python3 -sP /usr/sbin/firewalld --nofork --nopid

Nov 02 07:31:32 rac1.raclab.test systemd[1]: Starting firewalld.service - firewalld - dynamic firewall daemon...
Nov 02 07:31:33 rac1.raclab.test systemd[1]: Started firewalld.service - firewalld - dynamic firewall daemon.
```

Display active zones:

```bash
[root@rac1 ~]# firewall-cmd --get-active-zones
public (default)
  interfaces: enp0s3 enp0s8 enp0s9
```

Inspect the configuration:

```bash
[root@rac1 ~]# firewall-cmd --list-all
public (default, active)
  target: default
  ingress-priority: 0
  egress-priority: 0
  icmp-block-inversion: no
  interfaces: enp0s3 enp0s8 enp0s9
  sources: 
  services: cockpit dhcpv6-client ssh
  ports: 
  protocols: 
  forward: yes
  masquerade: no
  forward-ports: 
  source-ports: 
  icmp-blocks: 
  rich rules: 
```

Check SELinux:

```bash
[root@rac1 ~]# getenforce
Enforcing
```

Do not disable firewall protection or SELinux without reviewing the requirements and implications.

The exact configuration depends on the Grid Infrastructure release, network topology, and Oracle's documented support requirements.

A VirtualBox host-only network does not bypass the firewall inside the Oracle Linux guest.

Ensure that required cluster communication is permitted on the private interconnect and that necessary public services are accessible.

Review the current Oracle documentation before making permanent changes.

---

## 11. Attaching the Shared ASM Disks

**Location: Physical VirtualBox host**

The shared disks were created earlier:

| Disk | Size | Intended use |
|---|---|---|
| `asm-ocr01.vdi` | 10 GB | OCR / voting storage |
| `asm-ocr02.vdi` | 10 GB | OCR / voting storage |
| `asm-ocr03.vdi` | 10 GB | OCR / voting storage |
| `asm-data01.vdi` | 100 GB | Database data |
| `asm-fra01.vdi` | 50 GB | Fast recovery area |

All five disks were configured as shareable VirtualBox media.

### 11.1 Shut Down Both RAC Nodes

Run on both nodes:

```bash
[root@rac1 ~]# shutdown -h now
[root@rac1 ~]# Connection to 192.168.56.101 closed by remote host.
Connection to 192.168.56.101 closed.
```

Confirm that both virtual machines are powered off.

### 11.2 Attach the Disks to RAC1

In VirtualBox Manager:

1. Select `rac1`.
2. Open **Settings → Storage**.
3. Select or create a suitable storage controller.
4. Attach the five existing shared VDI files.
5. Save the configuration.

Use the existing disk images.

Do not create new copies.

![VM-RAC](../screenshots/rac5.png)
![VM-RAC](../screenshots/rac6.png)
![VM-RAC](../screenshots/rac7.png)

### 11.3 Attach the Same Disks to RAC2

Repeat the procedure for `rac2`.

Attach the exact same five VDI files.

![VM-RAC](../screenshots/rac11.png)

Both virtual machines must reference the same underlying shared disk images.

A consistent storage controller and port arrangement is recommended.

### 11.4 Verify the Disks on Both Nodes

Start both virtual machines.

Run:

```bash
[root@rac1 ~]# lsblk -o NAME,SIZE,TYPE,MODEL,SERIAL
NAME                   SIZE TYPE MODEL         SERIAL
sda                    100G disk VBOX HARDDISK VB38902df0-7a6a6339
├─sda1                   1M part               
├─sda2                   2G part               
└─sda3                  98G part               
  ├─vg_system-lv_root   10G lvm                
  ├─vg_system-lv_swap  5.9G lvm                
  ├─vg_system-lv_tmp     3G lvm                
  ├─vg_system-lv_home    5G lvm                
  └─vg_system-lv_u01    70G lvm                
sdb                    100G disk VBOX HARDDISK VBc7feac04-061ed1c4
sdc                     50G disk VBOX HARDDISK VBdf2f71c2-477b736f
sdd                     10G disk VBOX HARDDISK VBd791c4b8-c277f058
sde                     10G disk VBOX HARDDISK VB76bae767-b762ca64
sdf                     10G disk VBOX HARDDISK VBe2f3baa6-9da462bb
sr0                   1024M rom  VBOX CD-ROM   VB0-01f003f6

[root@rac2 ~]# lsblk -o NAME,SIZE,TYPE,MODEL,SERIAL
NAME                   SIZE TYPE MODEL         SERIAL
sda                    100G disk VBOX HARDDISK VBadacf6f1-d7f0d83b
├─sda1                   1M part               
├─sda2                   2G part               
└─sda3                  98G part               
  ├─vg_system-lv_root   10G lvm                
  ├─vg_system-lv_swap  5.9G lvm                
  ├─vg_system-lv_tmp     3G lvm                
  ├─vg_system-lv_home    5G lvm                
  └─vg_system-lv_u01    70G lvm                
sdb                    100G disk VBOX HARDDISK VBc7feac04-061ed1c4
sdc                     50G disk VBOX HARDDISK VBdf2f71c2-477b736f
sdd                     10G disk VBOX HARDDISK VB76bae767-b762ca64
sde                     10G disk VBOX HARDDISK VBd791c4b8-c277f058
sdf                     10G disk VBOX HARDDISK VBe2f3baa6-9da462bb
sr0                   1024M rom  VBOX CD-ROM   VB0-01f003f6
```


### 11.5 Verify Persistent Disk Identifiers

Inspect the available disk identifiers:

```bash
[root@rac1 ~]# ls -l /dev/disk/by-id/
total 0
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_CD-ROM_VB0-01f003f6 -> ../../sr0
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VB38902df0-7a6a6339 -> ../../sda
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 ata-VBOX_HARDDISK_VB38902df0-7a6a6339-part1 -> ../../sda1
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 ata-VBOX_HARDDISK_VB38902df0-7a6a6339-part2 -> ../../sda2
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 ata-VBOX_HARDDISK_VB38902df0-7a6a6339-part3 -> ../../sda3
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VB76bae767-b762ca64 -> ../../sde
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBc7feac04-061ed1c4 -> ../../sdb
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBd791c4b8-c277f058 -> ../../sdd
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBdf2f71c2-477b736f -> ../../sdc
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBe2f3baa6-9da462bb -> ../../sdf
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 dm-name-vg_system-lv_home -> ../../dm-3
lrwxrwxrwx. 1 root root 10 Nov  2 08:09 dm-name-vg_system-lv_root -> ../../dm-0
lrwxrwxrwx. 1 root root 10 Nov  2 08:09 dm-name-vg_system-lv_swap -> ../../dm-1
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 dm-name-vg_system-lv_tmp -> ../../dm-2
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 dm-name-vg_system-lv_u01 -> ../../dm-4
lrwxrwxrwx. 1 root root 10 Nov  2 08:09 dm-uuid-LVM-UkWpB0aPYbsFvRTT65m0ewY5etyRg3An1WYcV1zJnzEvwMTbDQD16QTMVCr2tplx -> ../../dm-1
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 dm-uuid-LVM-UkWpB0aPYbsFvRTT65m0ewY5etyRg3An4x9ud7RJx3bESYWguDVYjZ323lydO8O3 -> ../../dm-2
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 dm-uuid-LVM-UkWpB0aPYbsFvRTT65m0ewY5etyRg3An5qT1NUUdzr8T38d9T1lK1a8cCH34XsRO -> ../../dm-4
lrwxrwxrwx. 1 root root 10 Nov  2 08:09 dm-uuid-LVM-UkWpB0aPYbsFvRTT65m0ewY5etyRg3An86NLZneI39dHo0l4spVfDlz7FS1D825u -> ../../dm-0
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 dm-uuid-LVM-UkWpB0aPYbsFvRTT65m0ewY5etyRg3AnGtKiN7J4Gh3kCycZQbSDhfrgNyecHcUl -> ../../dm-3
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 lvm-pv-uuid-EFE8VT-PZ4A-qJGr-3ZNg-waCv-G2q7-PTpEFa -> ../../sda3
```

Inspect the properties of each candidate device:

```bash
[root@rac1 ~]# udevadm info --query=property --name=/dev/sdb
DEVPATH=/devices/pci0000:00/0000:00:0d.0/ata4/host3/target3:0:0/3:0:0:0/block/sdb
DEVNAME=/dev/sdb
DEVTYPE=disk
DISKSEQ=2
MAJOR=8
MINOR=16
SUBSYSTEM=block
USEC_INITIALIZED=24711075
ID_ATA=1
ID_TYPE=disk
ID_BUS=ata
ID_MODEL=VBOX_HARDDISK
ID_MODEL_ENC=VBOX\x20HARDDISK\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20
ID_REVISION=1.0
ID_SERIAL=VBOX_HARDDISK_VBc7feac04-061ed1c4
ID_SERIAL_SHORT=VBc7feac04-061ed1c4
ID_ATA_WRITE_CACHE=1
ID_ATA_WRITE_CACHE_ENABLED=1
ID_ATA_READ_LOOKAHEAD=1
ID_ATA_READ_LOOKAHEAD_ENABLED=1
ID_ATA_FEATURE_SET_PM=1
ID_ATA_FEATURE_SET_PM_ENABLED=1
ID_ATA_SATA=1
ID_ATA_SATA_SIGNAL_RATE_GEN2=1
ID_ATA_PERIPHERAL_DEVICE_TYPE=0
ID_PATH=pci-0000:00:0d.0-ata-2.0
ID_PATH_TAG=pci-0000_00_0d_0-ata-2_0
ID_PATH_ATA_COMPAT=pci-0000:00:0d.0-ata-2
SCSI_TPGS=0
SCSI_TYPE=disk
SCSI_VENDOR=ATA
SCSI_VENDOR_ENC=ATA\x20\x20\x20\x20\x20
ID_SCSI=1
ID_SCSI_INQUIRY=1
SCSI_IDENT_SERIAL=VBc7feac04-061ed1c4
SCSI_IDENT_LUN_VENDOR=VBc7feac04-061ed1c4
SCSI_IDENT_LUN_T10=ATA_VBOX_HARDDISK_VBc7feac04-061ed1c4
SCSI_IDENT_LUN_ATA=VBOX_HARDDISK_VBc7feac04-061ed1c4
ID_VENDOR=ATA
ID_VENDOR_ENC=ATA\x20\x20\x20\x20\x20
ID_SCSI_SERIAL=VBc7feac04-061ed1c4
DEVLINKS=/dev/disk/by-id/ata-VBOX_HARDDISK_VBc7feac04-061ed1c4 /dev/disk/by-path/pci-0000:00:0d.0-ata-2 /dev/disk/by-path/pci-0000:00:0d.0-ata-2.0 /dev/disk/by-diskseq/2
TAGS=:systemd:
CURRENT_TAGS=:systemd:
```

Repeat for each shared disk, using the actual device names.

Record the persistent identifiers and confirm that they identify the same underlying disk on both RAC nodes.

### 11.6 Preparing the Shared Disks for Oracle ASM

**Server: RAC1**

After identifying the five shared disks, prepare them for use by Oracle Automatic Storage Management (ASM).

Oracle ASM manages raw block storage and does not require conventional Linux filesystems such as XFS or ext4.

For this laboratory, each shared disk will contain a single GPT partition occupying the available disk space.

The partitions will later be presented to Oracle ASM during Grid Infrastructure installation.

**Important:** The following commands modify disk partition tables and will destroy existing partition metadata. Execute them only on the five newly created, empty shared VDI disks.

Do not run these commands against the operating-system disk (`/dev/sda`).

#### Verify the Shared Disks

Display the block devices:

```bash
[root@rac1 ~]# lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
NAME                   SIZE TYPE FSTYPE      MOUNTPOINTS
sda                    100G disk             
├─sda1                   1M part             
├─sda2                   2G part xfs         /boot
└─sda3                  98G part LVM2_member 
  ├─vg_system-lv_root   10G lvm  xfs         /
  ├─vg_system-lv_swap  5.9G lvm  swap        [SWAP]
  ├─vg_system-lv_tmp     3G lvm  xfs         /tmp
  ├─vg_system-lv_home    5G lvm  xfs         /home
  └─vg_system-lv_u01    70G lvm  xfs         /u01
sdb                    100G disk             
sdc                     50G disk             
sdd                     10G disk             
sde                     10G disk             
sdf                     10G disk             
sr0                   1024M rom 
```

Confirm that the following disks are present and do not contain filesystems or mounted partitions:

| Device | Planned ASM use | Capacity |
|---|---|---|
| `/dev/sde` | OCR01 | 10 GB |
| `/dev/sdd` | OCR02 | 10 GB |
| `/dev/sdf` | OCR03 | 10 GB |
| `/dev/sdb` | DATA01 | 100 GB |
| `/dev/sdc` | FRA01 | 50 GB |

The device names are based on the RAC1 output collected for this laboratory. Verify them again before proceeding.

#### Create GPT Partition Tables

The following commands use the device names verified on RAC1. These names are specific to this virtual machine and must be checked before partitioning. Persistent disk identifiers will be used to configure stable ASM disk discovery in the next article.

```bash
[root@rac1 ~]# parted -s /dev/sdb mklabel gpt
[root@rac1 ~]# parted -s /dev/sdc mklabel gpt
[root@rac1 ~]# parted -s /dev/sdd mklabel gpt
[root@rac1 ~]# parted -s /dev/sde mklabel gpt
[root@rac1 ~]# parted -s /dev/sdf mklabel gpt
```

These commands create GPT partition tables on the five shared disks.

No Linux filesystem is created.

#### Create ASM Candidate Partitions

Create one partition on each shared disk:

```bash
[root@rac1 ~]# parted -s -a optimal /dev/sdb mkpart primary 0% 100%
[root@rac1 ~]# parted -s -a optimal /dev/sdc mkpart primary 0% 100%
[root@rac1 ~]# parted -s -a optimal /dev/sdd mkpart primary 0% 100%
[root@rac1 ~]# parted -s -a optimal /dev/sde mkpart primary 0% 100%
[root@rac1 ~]# parted -s -a optimal /dev/sdf mkpart primary 0% 100%
```

Verify the partition boundaries and alignment:

```bash
[root@rac1 ~]# for disk in sdb sdc sdd sde sdf; do
    echo "========== /dev/$disk =========="
    parted /dev/$disk unit MiB print
done
========== /dev/sdb ==========
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdb: 102400MiB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start    End        Size       File system  Name     Flags
 1      1.00MiB  102399MiB  102398MiB               primary

========== /dev/sdc ==========
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdc: 51200MiB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start    End       Size      File system  Name     Flags
 1      1.00MiB  51199MiB  51198MiB               primary

========== /dev/sdd ==========
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdd: 10240MiB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start    End       Size      File system  Name     Flags
 1      1.00MiB  10239MiB  10238MiB               primary

========== /dev/sde ==========
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sde: 10240MiB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start    End       Size      File system  Name     Flags
 1      1.00MiB  10239MiB  10238MiB               primary

========== /dev/sdf ==========
Model: ATA VBOX HARDDISK (scsi)
Disk /dev/sdf: 10240MiB
Sector size (logical/physical): 512B/512B
Partition Table: gpt
Disk Flags: 

Number  Start    End       Size      File system  Name     Flags
 1      1.00MiB  10239MiB  10238MiB               primary
```

The `0%` value requests the beginning of the disk, but the actual starting sector depends on the partition table and alignment requirements. For a new GPT partition table, `1MiB 100%` is generally a more predictable choice.

The verification output establishes the actual partition layout used in this laboratory.

The resulting partitions are intended for Oracle ASM.

Do not run `mkfs.xfs`, `mkfs.ext4`, or other filesystem creation commands.

#### Reload the Partition Tables

Notify the operating system about the new partitions:

```bash
[root@rac1 ~]# partprobe 
[root@rac1 ~]# udevadm settle

```

Verify that the partitions are visible:

```bash
[root@rac1 ~]# lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
NAME                   SIZE TYPE FSTYPE      MOUNTPOINTS
sda                    100G disk             
├─sda1                   1M part             
├─sda2                   2G part xfs         /boot
└─sda3                  98G part LVM2_member 
  ├─vg_system-lv_root   10G lvm  xfs         /
  ├─vg_system-lv_swap  5.9G lvm  swap        [SWAP]
  ├─vg_system-lv_tmp     3G lvm  xfs         /tmp
  ├─vg_system-lv_home    5G lvm  xfs         /home
  └─vg_system-lv_u01    70G lvm  xfs         /u01
sdb                    100G disk             
└─sdb1                 100G part             
sdc                     50G disk             
└─sdc1                  50G part             
sdd                     10G disk             
└─sdd1                  10G part             
sde                     10G disk             
└─sde1                  10G part             
sdf                     10G disk             
└─sdf1                  10G part             
sr0                   1024M rom   
```

The operating-system disk may contain additional logical volumes, depending on the installation layout.

The important result is that each shared disk now contains one partition.

### 11.7 Verifying Shared Disk Partitions on RAC2

**Server: RAC2**

Because the virtual disks are shared between RAC1 and RAC2, the partition tables created on RAC1 are stored on the same underlying VDI files.

RAC2 must recognize the same partitions.

First, verify that RAC2 sees the shared disks:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
```

If the partitions do not appear immediately, rescan the shared disks or reboot RAC2 during this initial laboratory setup.

For example:

```bash
[root@rac2 ~]# partprobe 
```

After rescan or reboot of RAC2, check again:

```bash
[root@rac2 ~]# lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
NAME                   SIZE TYPE FSTYPE      MOUNTPOINTS
sda                    100G disk             
├─sda1                   1M part             
├─sda2                   2G part xfs         /boot
└─sda3                  98G part LVM2_member 
  ├─vg_system-lv_root   10G lvm  xfs         /
  ├─vg_system-lv_swap  5.9G lvm  swap        [SWAP]
  ├─vg_system-lv_tmp     3G lvm  xfs         /tmp
  ├─vg_system-lv_home    5G lvm  xfs         /home
  └─vg_system-lv_u01    70G lvm  xfs         /u01
sdb                    100G disk             
└─sdb1                 100G part             
sdc                     50G disk             
└─sdc1                  50G part             
sdd                     10G disk             
└─sdd1                  10G part             
sde                     10G disk             
└─sde1                  10G part             
sdf                     10G disk             
└─sdf1                  10G part             
sr0                   1024M rom 
```

Verify the persistent partition identifiers:

```bash
[root@rac2 ~]# ls -l /dev/disk/by-id/ | grep VBOX_HARDDISK
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VB76bae767-b762ca64 -> ../../sdd
lrwxrwxrwx. 1 root root 10 Nov  3 04:26 ata-VBOX_HARDDISK_VB76bae767-b762ca64-part1 -> ../../sdd1
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBadacf6f1-d7f0d83b -> ../../sda
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 ata-VBOX_HARDDISK_VBadacf6f1-d7f0d83b-part1 -> ../../sda1
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 ata-VBOX_HARDDISK_VBadacf6f1-d7f0d83b-part2 -> ../../sda2
lrwxrwxrwx. 1 root root 10 Nov  2 08:10 ata-VBOX_HARDDISK_VBadacf6f1-d7f0d83b-part3 -> ../../sda3
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBc7feac04-061ed1c4 -> ../../sdb
lrwxrwxrwx. 1 root root 10 Nov  3 04:26 ata-VBOX_HARDDISK_VBc7feac04-061ed1c4-part1 -> ../../sdb1
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBd791c4b8-c277f058 -> ../../sde
lrwxrwxrwx. 1 root root 10 Nov  3 04:26 ata-VBOX_HARDDISK_VBd791c4b8-c277f058-part1 -> ../../sde1
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBdf2f71c2-477b736f -> ../../sdc
lrwxrwxrwx. 1 root root 10 Nov  3 04:26 ata-VBOX_HARDDISK_VBdf2f71c2-477b736f-part1 -> ../../sdc1
lrwxrwxrwx. 1 root root  9 Nov  2 08:10 ata-VBOX_HARDDISK_VBe2f3baa6-9da462bb -> ../../sdf
lrwxrwxrwx. 1 root root 10 Nov  3 04:26 ata-VBOX_HARDDISK_VBe2f3baa6-9da462bb-part1 -> ../../sdf1
```

The same underlying shared disks should be identifiable on both nodes, even if the `/dev/sdX` device names differ.

**Do not repeat the partition creation commands on RAC2.**

Both RAC nodes must access the same partition tables and the same underlying shared block devices.

## 12. Final Oracle RAC Infrastructure Verification

Before proceeding to Oracle Grid Infrastructure installation, review the completed infrastructure and identify any remaining prerequisites.

| Component | Verification |
|---|---|
| Oracle Linux | Both nodes run Oracle Linux 10.2 |
| Operating-system updates | Confirm the update and reboot results on both nodes |
| Kernel | Verify compatibility with the selected Oracle Grid Infrastructure Release Update |
| Hostnames | `rac1.raclab.test` and `rac2.raclab.test` |
| Public network | `192.168.56.101` and `192.168.56.102` |
| Private network | `192.168.57.101` and `192.168.57.102` |
| DNS server | `192.168.56.10` |
| VIP records | Both VIP hostnames resolve correctly |
| SCAN | `rac-scan.raclab.test` resolves to three addresses |
| Network connectivity | Public and private communication verified |
| External DNS | Verify resolution of Oracle Linux repository hostnames |
| Time synchronization | RAC1 synchronized; RAC2 synchronized; |
| Shared storage | Five shared disks visible on both nodes |
| ASM candidate partitions | One GPT partition on each shared disk |
| Persistent identifiers | Shared disks identified consistently on both nodes |

The infrastructure is prepared for the next phase, but Oracle Grid Infrastructure installation must not begin until the remaining release-specific prerequisites, time synchronization, and ASM device-access configuration have been successfully validated.

---

## 13. RAC Node Preparation Summary

The following table summarizes the intended state of the environment.

| Component | Configuration |
|---|---|
| DNS server | `rac-dns.raclab.test` |
| DNS server IP | `192.168.56.10` |
| RAC1 hostname | `rac1.raclab.test` |
| RAC2 hostname | `rac2.raclab.test` |
| Operating system | Oracle Linux 10.2 |
| RAC1 public IP | `192.168.56.101` |
| RAC2 public IP | `192.168.56.102` |
| RAC1 private IP | `192.168.57.101` |
| RAC2 private IP | `192.168.57.102` |
| RAC1 VIP | `192.168.56.111`, reserved |
| RAC2 VIP | `192.168.56.112`, reserved |
| SCAN | `rac-scan.raclab.test` |
| SCAN addresses | `.121`, `.122`, `.123`, reserved |
| Shared OCR disks | 3 × 10 GB |
| Shared DATA disk | 100 GB |
| Shared FRA disk | 50 GB |
| Time synchronization | RAC1 synchronized; RAC2 synchronized; |

The VirtualBox infrastructure, DNS configuration, RAC node networking, and shared storage preparation are complete. Operating-system prerequisite validation, successful time synchronization, and persistent ASM device-access configuration remain necessary before installing Oracle Grid Infrastructure.
---

## Conclusion

The first part of the Oracle RAC 19c installation series establishes the infrastructure for a two-node Oracle RAC laboratory using Oracle VM VirtualBox and Oracle Linux 10.2.

A dedicated BIND DNS server provides forward and reverse name resolution for the RAC public hostnames, virtual IP addresses, and SCAN. Separate public and private host-only networks provide the connectivity required for cluster communication.

Both RAC virtual machines have been created and installed with Oracle Linux 10.2. Their network interfaces, hostnames, DNS resolution, and public and private connectivity have been configured and tested.

Five shareable VirtualBox VDI disks have been attached to both RAC nodes and partitioned as Oracle ASM storage candidates. Persistent disk identifiers have also been examined to identify the shared disks consistently across the nodes.

Before Oracle Grid Infrastructure installation, the remaining operating-system prerequisites, time synchronization, software compatibility, and ASM device-access configuration must be validated.

**Oracle Grid Infrastructure, Oracle Clusterware, Oracle ASM disk groups, and Oracle RAC Database have not yet been installed.**

The next article will cover the installation and configuration of Oracle Grid Infrastructure, Oracle ASM, and Oracle RAC Database 19c.

---

## Next: Installing Oracle Grid Infrastructure, Configuring ASM, and Deploying Oracle RAC Database 19c

The next article covers:

1. Preparing the Oracle Grid Infrastructure 19c and Oracle Database 19c installation images.
2. Applying the required Release Updates and one-off patches for Oracle Linux 10.2.
3. Completing the operating-system and Grid Infrastructure prerequisite checks.
4. Configuring persistent ASM disk discovery and permissions.
5. Installing Oracle Grid Infrastructure across both RAC nodes.
6. Configuring Oracle Clusterware, VIPs, SCAN, and network interfaces.
7. Creating and validating the OCR, DATA, and FRA ASM disk groups.
8. Installing Oracle Database 19c software for Oracle RAC.
9. Creating a two-instance Oracle RAC database using DBCA.
10. Verifying Oracle Clusterware, ASM, database instances, listeners, and services.

The next phase will transform the prepared virtual infrastructure into a functioning two-node Oracle RAC 19c laboratory.

---

## Official Oracle Documentation

1. **Oracle Grid Infrastructure Installation and Upgrade Guide for Linux 19c**

   https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/

2. **Supported Oracle Linux 10 Distributions for x86-64**

   https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/supported-oracle-linux-10-distributions-for-x86-64.html

3. **Oracle Grid Infrastructure Operating System Checklist**

   https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/operating-system-checklist-for-oracle-grid-infrastructure-and-oracle-rac.html

4. **Configuring Networks for Oracle Grid Infrastructure and Oracle RAC**

   https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/configuring-networks-for-oracle-grid-infrastructure-and-oracle-rac.html

5. **Configuring Users, Groups, and Environments**

   https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/configuring-users-groups-and-environments-for-oracle-grid-infrastructure-and-oracle-database.html

6. **Configuring Storage for Oracle Grid Infrastructure**

   https://docs.oracle.com/en/database/oracle/oracle-database/19/cwlin/configuring-storage-for-oracle-grid-infrastructure.html

7. **Oracle Database 19c Installation on Oracle Linux 10**

   https://docs.oracle.com/en/database/oracle/oracle-database/19/rnrdm/installing-oracle-database-19c-oracle-linux-10-and-red-hat-enterprise-linux-10.html

8. **Oracle Linux 10 Installation Documentation**

   https://docs.oracle.com/en/operating-systems/oracle-linux/10/install/

9. **Oracle VM VirtualBox User Manual**

   https://docs.oracle.com/en/virtualization/virtualbox/7.1/user/