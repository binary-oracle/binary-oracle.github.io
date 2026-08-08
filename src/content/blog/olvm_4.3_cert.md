---
title: "Renewing Certificates in Oracle Linux Virtualization Manager 4.3"
description: "Renew Oracle Linux Virtualization Manager Engine and KVM host certificates using the OlvmKvmCerts utility."
pubDate: 2026-02-13
tags:
  - Oracle Linux Virtualization Manager
  - OLVM
  - Certificates
  - Virtualization
---

Managing certificates is a critical administrative task in Oracle Linux Virtualization Manager (OLVM) environments, as expired certificates can result in host disconnections, authentication failures, and service disruptions. In this article, we will cover the process of renewing certificates in OLVM version 4.3 before they expire, ensuring secure communication between the engine and managed KVM hosts.

For this procedure, we will use the **OlvmKvmCerts** utility provided by Oracle to renew the required certificates. In OLVM 4.3, although some engine-related certificates can be renewed using the `engine-setup` command, not all certificates are automatically refreshed. Certain components require manual renewal because the certificate renewal process in this version is not fully automated.

It is important to note that this limitation has been addressed in **OLVM 4.4.10.7-1.0.24 and later.** Additionally, OLVM 4.3 has been unsupported since October 2022, and OLVM 4.4 reached end of support in July 2024. As these versions no longer receive updates or security fixes, upgrading to OLVM 4.5—the latest supported release—is strongly recommended to ensure continued security, stability, and full supportability.

In the following sections, we will outline the certificate renewal steps required in OLVM 4.3, including the manual tasks necessary to avoid service interruption.

The OlvmKvmCerts utility is available through MOS (My Oracle Support) under Doc ID KB370896 titled “OLVM: OlvmKvmCerts – Script to Check or Renew Hypervisor Certificates.”


Additional guidance and detailed procedures for renewing SSL certificates that are expired or approaching expiration can be found in Doc ID KB524781, titled “OLVM: How to Renew SSL Certificates that are Expired or Nearing Expiration.”

## Verify Certificate Expiration

This section describes how to verify certificate expiration dates for the Oracle Linux Virtualization Manager Engine and managed KVM hosts.

- The **OlvmKvmCerts** utility has been downloaded from My Oracle Support.
- Cluster fencing is disabled.
- Log in as the `root` user.
- A backup of the existing certificates is available.

### Prepare the Utility

Set the required ownership and permissions.

Run the following commands:

```console
[root@mgmt-olvm01 ~]# chmod 755 OlvmKvmCerts
[root@mgmt-olvm01 ~]# chown root:root OlvmKvmCerts
```

### Verify the Utility Installation

Execute the utility without arguments to confirm that it is accessible and to display the available commands.

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts
```

Expected output:

```console
Usage: OlvmKvmCert [OPTION] <HOST|CLUSTER>

status                    Display the status of all certificates on the Engine host
list-hosts                List all Hypervisors
renew-host <HOST>         Renew the certificates for a single Hypervisor
renew-cluster <CLUSTER>   Renew all certificates of all Hypervisors in a single Cluster
renew-all                 Renew all certificates of all Hypervisors
check-host <HOST>         Check all certificates for a single Hypervisor
check-cluster <CLUSTER>   Check all certificates for all Hypervisors in a cluster
check-all                 Check all certificates for all Hypervisors
```

## Verify Engine Certificates

Display the current certificate expiration dates for the Oracle Linux Virtualization Manager Engine.

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts status
```

Example output:

```console
reports.cer                                          Mar  3 13:11:53 2026 GMT
kvm01.fra.techsolutions.de.cer                       Jun 14 07:47:58 2026 GMT
ovn-ndb.cer                                          Mar  3 13:11:54 2026 GMT
jboss.cer                                            Mar  3 13:11:53 2026 GMT
ovirt-provider-ovn.cer                               Mar  3 13:11:54 2026 GMT
vmconsole-proxy-host.cer                             Mar  3 13:12:03 2026 GMT
websocket-proxy.cer                                  Mar  3 13:11:53 2026 GMT
kvm02.fra.techsolutions.de.cer                       Jun 24 12:08:16 2026 GMT
imageio-proxy.cer                                    Mar  3 13:11:54 2026 GMT
engine.cer                                           Mar  3 13:11:53 2026 GMT
apache.cer                                           Mar  3 13:11:53 2026 GMT
ovn-sdb.cer                                          Mar  3 13:11:54 2026 GMT
vmconsole-proxy-user.cer                             Mar  3 13:12:03 2026 GMT
vmconsole-proxy-helper.cer                           Mar  3 13:12:03 2026 GMT
```

Review the certificate expiration dates before proceeding with certificate renewal.

## Back Up Existing Certificates

Before renewing the Engine certificates, create a backup of the current PKI directory. This backup can be used to restore the certificates if required.

Run the following command:

```console
[root@mgmt-olvm01 ~]# tar cf /var/tmp/pki$(date '+%Y%m%d%H%M%S').tar /etc/pki/
tar: Removing leading '/' from member names

[root@mgmt-olvm01 ~]# ls -ltra /var/tmp/pki*
-rw-r--r-- 1 root root 2375680 Feb 13 18:56 /var/tmp/pki20260213185644.tar
```

Verify that the backup archive was created successfully before proceeding.

---

## Renew the OLVM Engine Certificates

In a standalone Engine deployment, renew the Engine certificates by running `engine-setup` in offline mode.

Run the following command:

```console
[root@mgmt-olvm01 ~]# engine-setup --offline
```

> For a **Hosted Engine** deployment, enable **Global Maintenance Mode** before running `engine-setup`. After the certificate renewal completes successfully, disable Global Maintenance Mode.

During the renewal process:

- Running virtual machines continue to operate normally.
- The OLVM Administration Portal and API are temporarily unavailable while Engine services restart.
- Access to the management interface is restored automatically after the renewal process completes.

Example output:

```console
[root@mgmt-olvm01 ~]# engine-setup --offline
[ INFO  ] Stage: Initializing
[ INFO  ] Stage: Environment setup
          Configuration files: ['/etc/ovirt-engine-setup.conf.d/10-packaging-jboss.conf', '/etc/ovirt-engine-setup.conf.d/10-packaging.conf', '                                                                                              /etc/ovirt-engine-setup.conf.d/20-setup-ovirt-post.conf']
          Log file: /var/log/ovirt-engine/setup/ovirt-engine-setup-20260213185741-b5jax3.log
          Version: otopi-1.8.4 (otopi-1.8.4-1.el7)
[ INFO  ] Stage: Environment packages setup
[ INFO  ] Stage: Programs detection
[ INFO  ] Stage: Environment setup (late)
[ INFO  ] Stage: Environment customization

          --== PRODUCT OPTIONS ==--

[ INFO  ] ovirt-provider-ovn already installed, skipping.

          --== PACKAGES ==--


          --== NETWORK CONFIGURATION ==--

          Setup can automatically configure the firewall on this system.
          Note: automatic configuration of the firewall may overwrite current settings.
          NOTICE: iptables is deprecated and will be removed in future releases
          Do you want Setup to configure the firewall? (Yes, No) [Yes]: No

          --== DATABASE CONFIGURATION ==--

          The detected DWH database size is 486 MB.
          Setup can backup the existing database. The time and space required for the database backup depend on its size. This process takes ti                                                                                              me, and in some cases (for instance, when the size is few GBs) may take several hours to complete.
          If you choose to not back up the database, and Setup later fails for some reason, it will not be able to restore the database and all                                                                                               DWH data will be lost.
          Would you like to backup the existing database before upgrading it? (Yes, No) [Yes]: Yes
          Perform full vacuum on the oVirt engine history
          database ovirt_engine_history@localhost?
          This operation may take a while depending on this setup health and the
          configuration of the db vacuum process.
          See https://www.postgresql.org/docs/10/sql-vacuum.html
          (Yes, No) [No]: Yes

          --== OVIRT ENGINE CONFIGURATION ==--

          Perform full vacuum on the engine database engine@localhost?
          This operation may take a while depending on this setup health and the
          configuration of the db vacuum process.
          See https://www.postgresql.org/docs/10/sql-vacuum.html
          (Yes, No) [No]: Yes

          --== STORAGE CONFIGURATION ==--


          --== PKI CONFIGURATION ==--

          One or more of the certificates should be renewed, because they expire soon, or include an invalid expiry date, or do not include the                                                                                               subjectAltName extension, which can cause them to be rejected by recent browsers and up to date hosts.
          See https://www.ovirt.org/develop/release-management/features/infra/pki-renew/ for more details.
          Renew certificates? (Yes, No) [No]: Yes

          --== APACHE CONFIGURATION ==--


          --== SYSTEM CONFIGURATION ==--


          --== MISC CONFIGURATION ==--


          --== END OF CONFIGURATION ==--

[ INFO  ] Stage: Setup validation
          During execution engine service will be stopped (OK, Cancel) [OK]: OK
[WARNING] Less than 16384MB of memory is available
[ INFO  ] Cleaning stale zombie tasks and commands

          --== CONFIGURATION PREVIEW ==--

          Default SAN wipe after delete           : False
          Firewall manager                        : firewalld
          Update Firewall                         : False
          Host FQDN                               : mgmt-olvm01.fra.techsolutions.de
          Set up Cinderlib integration            : False
          Engine database secured connection      : False
          Engine database user name               : engine
          Engine database name                    : engine
          Engine database host                    : localhost
          Engine database port                    : 5432
          Engine database host name validation    : False
          Engine installation                     : True
          PKI organization                        : fra.techsolutions.de
          Renew PKI                               : True
          Set up ovirt-provider-ovn               : True
          Configure WebSocket Proxy               : True
          DWH installation                        : True
          DWH database secured connection         : False
          DWH database host                       : localhost
          DWH database user name                  : ovirt_engine_history
          DWH database name                       : ovirt_engine_history
          Backup DWH database                     : True
          DWH database port                       : 5432
          DWH database host name validation       : False
          Configure Image I/O Proxy               : True
          Configure VMConsole Proxy               : True

          Please confirm installation settings (OK, Cancel) [OK]: OK
[ INFO  ] Cleaning async tasks and compensations
[ INFO  ] Unlocking existing entities
[ INFO  ] Checking the Engine database consistency
[ INFO  ] Stage: Transaction setup
[ INFO  ] Stopping engine service
[ INFO  ] Stopping ovirt-fence-kdump-listener service
[ INFO  ] Stopping dwh service
[ INFO  ] Stopping Image I/O Proxy service
[ INFO  ] Stopping vmconsole-proxy service
[ INFO  ] Stopping websocket-proxy service
[ INFO  ] Stage: Misc configuration (early)
[ INFO  ] Stage: Package installation
[ INFO  ] Stage: Misc configuration
[ INFO  ] Running vacuum full on the engine schema
[ INFO  ] Running vacuum full elapsed 0:00:04.085680
[ INFO  ] Upgrading CA
[ INFO  ] Renewing engine certificate
[ INFO  ] Renewing jboss certificate
[ INFO  ] Renewing websocket-proxy certificate
[ INFO  ] Renewing apache certificate
[ INFO  ] Renewing reports certificate
[ INFO  ] Renewing imageio-proxy certificate
[ INFO  ] Updating /etc/ovirt-imageio-proxy/ovirt-imageio-proxy.conf to use apache key and certificate
[ INFO  ] Backing up database localhost:ovirt_engine_history to '/var/lib/ovirt-engine-dwh/backups/dwh-20260213185823.PdLhW_.dump'.
[ INFO  ] Creating/refreshing DWH database schema
[ INFO  ] Configuring Image I/O Proxy
[ INFO  ] Configuring WebSocket Proxy
[ INFO  ] Backing up database localhost:engine to '/var/lib/ovirt-engine/backups/engine-20260213185832.0JpDNf.dump'.
[ INFO  ] Creating/refreshing Engine database schema
[ INFO  ] Running vacuum full on the ovirt_engine_history schema
[ INFO  ] Running vacuum full elapsed 0:00:06.812698
[ INFO  ] Creating/refreshing Engine 'internal' domain database schema
          Unregistering existing client registration info.
[ INFO  ] Generating post install configuration file '/etc/ovirt-engine-setup.conf.d/20-setup-ovirt-post.conf'
[ INFO  ] Stage: Transaction commit
[ INFO  ] Stage: Closing up
[ INFO  ] Starting engine service
[ INFO  ] Starting dwh service
[ INFO  ] Restarting ovirt-vmconsole proxy service

          --== SUMMARY ==--

[ INFO  ] Restarting httpd
          Web access is enabled at:
              http://mgmt-olvm01.fra.techsolutions.de:80/ovirt-engine
              https://mgmt-olvm01.fra.techsolutions.de:443/ovirt-engine
          Internal CA 82:49:4D:84:3E:D4:87:02:6B:18:68:12:05:10:AB:9E:1D:AA:72:54
          SSH fingerprint: SHA256:DNpliAyHyVpac9BQJz6/vhG/5NvIhO01euIcj7rIgr8
[WARNING] Less than 16384MB of memory is available

          --== END OF SUMMARY ==--

[ INFO  ] Stage: Clean up
          Log file is located at /var/log/ovirt-engine/setup/ovirt-engine-setup-20260213185741-b5jax3.log
[ INFO  ] Generating answer file '/var/lib/ovirt-engine/setup/answers/20260213185857-setup.conf'
[ INFO  ] Stage: Pre-termination
[ INFO  ] Stage: Termination
[ INFO  ] Execution of setup completed successfully
```

## Verify the Renewed Certificates

After the certificate renewal completes, verify that the Engine certificates have been updated.

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts status

    reports.cer                                         Jan 18 17:58:22 2031 GMT
    kvm01.fra.techsolutions.de.cer     	                Jun 14 07:47:58 2026 GMT
    ovn-ndb.cer                                         Mar  3 13:11:54 2026 GMT
    jboss.cer                                           Jan 18 17:58:21 2031 GMT
    ovirt-provider-ovn.cer                              Mar  3 13:11:54 2026 GMT
    vmconsole-proxy-host.cer                            Mar  3 13:12:03 2026 GMT
    websocket-proxy.cer                                 Jan 18 17:58:22 2031 GMT
    kvm02.fra.techsolutions.de.cer 	                    Jun 24 12:08:16 2026 GMT
    imageio-proxy.cer                                   Jan 18 17:58:22 2031 GMT
    engine.cer                                          Jan 18 17:58:21 2031 GMT
    apache.cer                                          Jan 18 17:58:22 2031 GMT
    ovn-sdb.cer                                         Mar  3 13:11:54 2026 GMT
    vmconsole-proxy-user.cer                            Mar  3 13:12:03 2026 GMT
    vmconsole-proxy-helper.cer                          Mar  3 13:12:03 2026 GMT
```

Review the output and confirm that the certificate expiration dates reflect the new validity period.

> Depending on the OLVM release, not all certificates are renewed automatically. This behavior was addressed in **OLVM 4.4.10.7-1.0.24** and later releases.

## Renew the VMConsole Certificates

This procedure regenerates the VMConsole Proxy certificates on the OLVM Engine.

> For Hosted Engine deployments, enable **Global Maintenance Mode** before performing this procedure. Disable Global Maintenance Mode after the renewal has completed successfully.

Back up the existing VMConsole certificate files before regenerating them.

Run the following commands:
```console
[root@mgmt-olvm01 ~]# cd /etc/pki/ovirt-engine/keys
[root@mgmt-olvm01 keys]# mv vmconsole-proxy-host.p12 vmconsole-proxy-host.p12.bckp
[root@mgmt-olvm01 keys]# mv vmconsole-proxy-helper.key.nopass vmconsole-proxy-helper.key.nopass.bckp
[root@mgmt-olvm01 keys]# cd /etc/pki/
[root@mgmt-olvm01 pki]# mv ovirt-vmconsole ovirt-vmconsole_bkp
```

Regenerate the Certificates.
Run the following commands:

```console
[root@mgmt-olvm01 pki]# engine-setup --offline
[ INFO  ] Stage: Initializing
[ INFO  ] Stage: Environment setup
          Configuration files: ['/etc/ovirt-engine-setup.conf.d/10-packaging-jboss.conf', '/etc/ovirt-engine-setup.conf.d/10-packaging.conf', '                                                                                              /etc/ovirt-engine-setup.conf.d/20-setup-ovirt-post.conf']
          Log file: /var/log/ovirt-engine/setup/ovirt-engine-setup-20260213203342-fk227m.log
          Version: otopi-1.8.4 (otopi-1.8.4-1.el7)
[ INFO  ] Stage: Environment packages setup
[ INFO  ] Stage: Programs detection
[ INFO  ] Stage: Environment setup (late)
[ INFO  ] Stage: Environment customization

          --== PRODUCT OPTIONS ==--

[ INFO  ] ovirt-provider-ovn already installed, skipping.

          --== PACKAGES ==--


          --== NETWORK CONFIGURATION ==--

          Setup can automatically configure the firewall on this system.
          Note: automatic configuration of the firewall may overwrite current settings.
          NOTICE: iptables is deprecated and will be removed in future releases
          Do you want Setup to configure the firewall? (Yes, No) [Yes]: Yes
[ INFO  ] firewalld will be configured as firewall manager.

          --== DATABASE CONFIGURATION ==--

          The detected DWH database size is 257 MB.
          Setup can backup the existing database. The time and space required for the database backup depend on its size. This process takes ti                                                                                              me, and in some cases (for instance, when the size is few GBs) may take several hours to complete.
          If you choose to not back up the database, and Setup later fails for some reason, it will not be able to restore the database and all                                                                                               DWH data will be lost.
          Would you like to backup the existing database before upgrading it? (Yes, No) [Yes]: Yes
          Perform full vacuum on the oVirt engine history
          database ovirt_engine_history@localhost?
          This operation may take a while depending on this setup health and the
          configuration of the db vacuum process.
          See https://www.postgresql.org/docs/10/sql-vacuum.html
          (Yes, No) [No]: Yes

          --== OVIRT ENGINE CONFIGURATION ==--

          Perform full vacuum on the engine database engine@localhost?
          This operation may take a while depending on this setup health and the
          configuration of the db vacuum process.
          See https://www.postgresql.org/docs/10/sql-vacuum.html
          (Yes, No) [No]: Yes

          --== STORAGE CONFIGURATION ==--


          --== PKI CONFIGURATION ==--


          --== APACHE CONFIGURATION ==--


          --== SYSTEM CONFIGURATION ==--


          --== MISC CONFIGURATION ==--


          --== END OF CONFIGURATION ==--

[ INFO  ] Stage: Setup validation
          During execution engine service will be stopped (OK, Cancel) [OK]: OK
[WARNING] Less than 16384MB of memory is available
[ INFO  ] Cleaning stale zombie tasks and commands

          --== CONFIGURATION PREVIEW ==--

          Default SAN wipe after delete           : False
          Firewall manager                        : firewalld
          Update Firewall                         : True
          Host FQDN                               : mgmt-olvm01.fra.techsolutions.de
          Set up Cinderlib integration            : False
          Engine database secured connection      : False
          Engine database user name               : engine
          Engine database name                    : engine
          Engine database host                    : localhost
          Engine database port                    : 5432
          Engine database host name validation    : False
          Engine installation                     : True
          PKI organization                        : fra.techsolutions.de
          Set up ovirt-provider-ovn               : True
          Configure WebSocket Proxy               : True
          DWH installation                        : True
          DWH database secured connection         : False
          DWH database host                       : localhost
          DWH database user name                  : ovirt_engine_history
          DWH database name                       : ovirt_engine_history
          Backup DWH database                     : True
          DWH database port                       : 5432
          DWH database host name validation       : False
          Configure Image I/O Proxy               : True
          Configure VMConsole Proxy               : True

          Please confirm installation settings (OK, Cancel) [OK]: OK
[ INFO  ] Cleaning async tasks and compensations
[ INFO  ] Unlocking existing entities
[ INFO  ] Checking the Engine database consistency
[ INFO  ] Stage: Transaction setup
[ INFO  ] Stopping engine service
[ INFO  ] Stopping ovirt-fence-kdump-listener service
[ INFO  ] Stopping dwh service
[ INFO  ] Stopping Image I/O Proxy service
[ INFO  ] Stopping vmconsole-proxy service
[ INFO  ] Stopping websocket-proxy service
[ INFO  ] Stage: Misc configuration (early)
[ INFO  ] Stage: Package installation
[ INFO  ] Stage: Misc configuration
[ INFO  ] Running vacuum full on the engine schema
[ INFO  ] Running vacuum full elapsed 0:00:03.749465
[ INFO  ] Upgrading CA
[ INFO  ] Updating /etc/ovirt-imageio-proxy/ovirt-imageio-proxy.conf to use apache key and certificate
[ INFO  ] Backing up database localhost:ovirt_engine_history to '/var/lib/ovirt-engine-dwh/backups/dwh-20260213203402.F_HaQE.dump'.
[ INFO  ] Creating/refreshing DWH database schema
[ INFO  ] Configuring Image I/O Proxy
[ INFO  ] Configuring WebSocket Proxy
[ INFO  ] Backing up database localhost:engine to '/var/lib/ovirt-engine/backups/engine-20260213203411.h3mpov.dump'.
[ INFO  ] Creating/refreshing Engine database schema
[ INFO  ] Running vacuum full on the ovirt_engine_history schema
[ INFO  ] Running vacuum full elapsed 0:00:06.772340
[ INFO  ] Creating/refreshing Engine 'internal' domain database schema
          Unregistering existing client registration info.
[ INFO  ] Generating post install configuration file '/etc/ovirt-engine-setup.conf.d/20-setup-ovirt-post.conf'
[ INFO  ] Stage: Transaction commit
[ INFO  ] Stage: Closing up
[ INFO  ] Starting engine service
[ INFO  ] Starting dwh service
[ INFO  ] Restarting ovirt-vmconsole proxy service

          --== SUMMARY ==--

[ INFO  ] Restarting httpd
          Web access is enabled at:
              http://mgmt-olvm01.fra.techsolutions.de:80/ovirt-engine
              https://mgmt-olvm01.fra.techsolutions.de:443/ovirt-engine
          Internal CA 82:49:4D:84:3E:D4:87:02:6B:18:68:12:05:10:AB:9E:1D:AA:72:54
          SSH fingerprint: SHA256:DNpliAyHyVpac9BQJz6/vhG/5NvIhO01euIcj7rIgr8
[WARNING] Less than 16384MB of memory is available

          --== END OF SUMMARY ==--

[ INFO  ] Stage: Clean up
          Log file is located at /var/log/ovirt-engine/setup/ovirt-engine-setup-20260213203342-fk227m.log
[ INFO  ] Generating answer file '/var/lib/ovirt-engine/setup/answers/20260213203441-setup.conf'
[ INFO  ] Stage: Pre-termination
[ INFO  ] Stage: Termination
[ INFO  ] Execution of setup completed successfully
```

## Renew the OVN Certificates

This procedure regenerates the certificates used by the OVN services.

### 1. Determine the Certificate Subject

The existing certificate subject is required when generating the replacement certificates.

Run the following command:

```console
openssl x509 \
  -in /etc/pki/ovirt-engine/certs/ovirt-provider-ovn.cer \
  -noout -subject
```

Example output:

```console
subject= /C=US/O=fra.techsolutions.de/CN=mgmt-olvm01.fra.techsolutions.de
```

### 2. Generate New Certificates

Use the subject obtained in the previous step to generate new certificates for each OVN component.

> The `--password=mypass` option is required by the `pki-enroll-pkcs12.sh` utility and must be entered exactly as shown. Do not substitute or modify this value.

Run the following commands:

```console
/usr/share/ovirt-engine/bin/pki-enroll-pkcs12.sh \
  --name="ovirt-provider-ovn" \
  --password=mypass \
  --subject="/C=US/O=fra.techsolutions.de/CN=mgmt-olvm01.fra.techsolutions.de" \
  --keep-key

/usr/share/ovirt-engine/bin/pki-enroll-pkcs12.sh \
  --name="ovn-ndb" \
  --password=mypass \
  --subject="/C=US/O=fra.techsolutions.de/CN=mgmt-olvm01.fra.techsolutions.de" \
  --keep-key

/usr/share/ovirt-engine/bin/pki-enroll-pkcs12.sh \
  --name="ovn-sdb" \
  --password=mypass \
  --subject="/C=US/O=fra.techsolutions.de/CN=mgmt-olvm01.fra.techsolutions.de" \
  --keep-key
```

Successful execution produces output similar to the following:

```console
MAC verified OK
Using configuration from openssl.conf
Check that the request matches the signature
Signature ok

The Subject's Distinguished Name is as follows

countryName           :PRINTABLE:'US'
organizationName      :ASN.1 12:'fra.techsolutions.de'
commonName            :ASN.1 12:'mgmt-olvm01.fra.techsolutions.de'

Certificate is to be certified until Jan 18 19:59:47 2031 GMT (1800 days)
```

### 3. Restart the OVN Services

Restart the affected services to load the new certificates.

Run the following commands:

```console
systemctl restart ovirt-provider-ovn.service
systemctl restart ovn-northd.service
```

### 4. Verify the Certificate Renewal

Verify that the following certificates display the updated expiration dates:

- **OVN**
  - `ovirt-provider-ovn`
  - `ovn-ndb`
  - `ovn-sdb`

- **VMConsole Proxy**
  - `vmconsole-proxy-host`
  - `vmconsole-proxy-user`
  - `vmconsole-proxy-helper`

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts status

    reports.cer                                         Jan 18 17:58:22 2031 GMT
    kvm01.fra.techsolutions.de.cer                 		  Jun 14 07:47:58 2026 GMT
    ovn-ndb.cer                                         Jan 18 19:58:53 2031 GMT
    jboss.cer                                           Jan 18 17:58:21 2031 GMT
    ovirt-provider-ovn.cer                              Jan 18 19:59:47 2031 GMT
    vmconsole-proxy-host.cer                            Jan 18 19:31:58 2031 GMT
    websocket-proxy.cer                                 Jan 18 17:58:22 2031 GMT
    kvm02.fra.techsolutions.de.cer                 		  Jun 14 07:47:58 2026 GMT
    imageio-proxy.cer                                   Jan 18 17:58:22 2031 GMT
    engine.cer                                          Jan 18 17:58:21 2031 GMT
    apache.cer                                          Jan 18 17:58:22 2031 GMT
    ovn-sdb.cer                                         Jan 18 19:58:07 2031 GMT
    vmconsole-proxy-user.cer                            Jan 18 19:31:58 2031 GMT
    vmconsole-proxy-helper.cer                          Jan 18 19:21:27 2031 GMT
```

.## Check and Renew the KVM Host Certificates

After renewing and verifying the certificates on the OLVM Engine, check the certificate status on each KVM host before proceeding with the renewal.

### 1. List the KVM Hosts

Use the **OlvmKvmCerts** utility to list the KVM hosts managed by the OLVM Engine.

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts list-hosts
```

Example output:

```console
 name     |              host              | cluster
----------+--------------------------------+---------
 kvm01    | kvm01.fra.techsolutions.de    | Default
 kvm02    | kvm02.fra.techsolutions.de    | Default
```

Identify the fully qualified domain name (FQDN) of each KVM host for which you want to check the certificate status.

### 2. Check the Certificates on the First KVM Host

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts check-host kvm01.fra.techsolutions.de
```

Example output:

```console
... Host: kvm01.fra.techsolutions.de
Checking connection to kvm01.fra.techsolutions.de                     [PASS]
/etc/pki/vdsm/certs/vdsmcert.pem                    Jun 24 12:08:16 2026 GMT
Validating vdsm against ca                                            [PASS]
Checking vdsm private key                                             [PASS]
Checking vdsm ca permissions                                          [PASS]
Checking vdsm cert permissions                                        [PASS]
Checking vdsm key permissions                                         [PASS]
/etc/pki/vdsm/libvirt-spice/server-cert.pem         Jun 24 12:08:16 2026 GMT
Validating libvirt-spice against ca                                   [PASS]
Checking libvirt-spice private key                                    [PASS]
Checking libvirt-spice ca permissions                                 [PASS]
Checking libvirt-spice cert permissions                               [PASS]
Checking libvirt-spice key permissions                                [PASS]
/etc/pki/vdsm/libvirt-vnc/server-cert.pem           Jun 24 11:21:40 2026 GMT
Validating libvirt-vnc against ca                                     [PASS]
Checking libvirt-vnc private key                                      [PASS]
Checking libvirt-vnc ca permissions                                   [WARN]
Checking libvirt-vnc cert permissions                                 [WARN]
Checking libvirt-vnc key permissions                                  [WARN]
```

### 3. Check the Certificates on the Remaining KVM Hosts

Repeat the certificate check for each remaining KVM host.

For example, run the following command for `kvm02.fra.techsolutions.de`:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts check-host kvm02.fra.techsolutions.de
```

Example output:

```console
... Host: kvm02.fra.techsolutions.de
Checking connection to kvm02.fra.techsolutions.de                     [PASS]
/etc/pki/vdsm/certs/vdsmcert.pem                    Jun 24 12:08:16 2026 GMT
Validating vdsm against ca                                            [PASS]
Checking vdsm private key                                             [PASS]
Checking vdsm ca permissions                                          [PASS]
Checking vdsm cert permissions                                        [PASS]
Checking vdsm key permissions                                         [PASS]
/etc/pki/vdsm/libvirt-spice/server-cert.pem         Jun 24 12:08:16 2026 GMT
Validating libvirt-spice against ca                                   [PASS]
Checking libvirt-spice private key                                    [PASS]
Checking libvirt-spice ca permissions                                 [PASS]
Checking libvirt-spice cert permissions                               [PASS]
Checking libvirt-spice key permissions                                [PASS]
/etc/pki/vdsm/libvirt-vnc/server-cert.pem           Jun 24 11:21:40 2026 GMT
Validating libvirt-vnc against ca                                     [PASS]
Checking libvirt-vnc private key                                      [PASS]
Checking libvirt-vnc ca permissions                                   [WARN]
Checking libvirt-vnc cert permissions                                 [WARN]
Checking libvirt-vnc key permissions                                  [WARN]
```

Review the certificate expiration dates and validation results before proceeding with the KVM host certificate renewal.

## Host Maintenance Considerations

The **OlvmKvmCerts** utility does not explicitly require virtual machines to be migrated from a host before running the `renew-host` operation. The utility performs the following tasks:

- Backs up the existing certificates.
- Generates and signs new certificates.
- Copies the certificates to the KVM host.
- Restarts the required management services.

The documented workflow does not include a mandatory step to place the host into **Maintenance** mode or evacuate running virtual machines.

However, previous manual certificate renewal procedures for OLVM commonly required placing the host into **Maintenance** mode before renewing host certificates. In those procedures, virtual machines were migrated automatically (or shut down if migration was not possible) to ensure that no workloads were running during the maintenance operation.

### Recommended Practice

For production environments, Oracle recommends minimizing the impact of maintenance activities on running workloads. A conservative approach is to renew host certificates one host at a time by performing the following steps:

1. Place the KVM host into **Maintenance** mode.
2. Migrate all running virtual machines to another host in the cluster.
3. Renew the host certificates.
4. Verify that the host returns to the **Up** state.
5. Exit **Maintenance** mode.
6. Repeat the procedure for the remaining hosts.

This approach ensures that:

- No virtual machines are running on the host while certificates are being replaced.
- Management services can be restarted without affecting production workloads.
- Certificate renewal can be validated before workloads are returned to the host.

### Validation

The certificate renewal procedure described in this document was performed with the target host in a maintenance state and without running virtual machines.

The behavior of the `renew-host` operation while virtual machines remain active on the host was **not validated** as part of this procedure. Although restarting management services is generally not expected to interrupt already-running virtual machines, this behavior was not verified during testing.

For production environments, it is recommended to renew host certificates only after evacuating the host.

## Renew KVM Host Certificates

Renew the certificates on each KVM host individually.

### Renew Certificates for the First KVM Host

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts renew-host kvm01.fra.techsolutions.de
... Host: kvm01.fra.techsolutions.de
    Checking connection to kvm01.fra.techsolutions.de                 [PASS]
    Creating backup for kvm01.fra.techsolutions.de                    [PASS]
    Getting private key of kvm01.fra.techsolutions.de	                [PASS]
    Checking cert subject                                             [PASS]
    Generating cert request for kvm01.fra.techsolutions.de	          [PASS]
    Signing the cert for kvm01.fra.techsolutions.de	                  [PASS]
    Copying ca cert to kvm01.fra.techsolutions.de	                    [PASS]
    Copying vdsm cert to kvm01.fra.techsolutions.de	                  [PASS]
    Copying libvirt cert to kvm01.fra.techsolutions.de	              [PASS]
    Copying libvirt-spice cert to kvm01.fra.techsolutions.de	        [PASS]
    Copying libvirt-vnc cert to kvm01.fra.techsolutions.de	          [PASS]
    Disabling power management for kvm01.fra.techsolutions.de	        [PASS]
    Restarting services on kvm01.fra.techsolutions.de	                [PASS]
    Waiting for host to become Available                              [PASS]
    Enabling power management for kvm01.fra.techsolutions.de	        [PASS]
```

### Renew Certificates for the Second KVM Host

Repeat the procedure for the remaining KVM host.

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts renew-host kvm02.fra.techsolutions.de
... Host: kvm02.fra.techsolutions.de
    Checking connection to kvm02.fra.techsolutions.de                 [PASS]
    Creating backup for kvm02.fra.techsolutions.de                    [PASS]
    Getting private key of kvm02.fra.techsolutions.de	                [PASS]
    Checking cert subject                                             [PASS]
    Generating cert request for kvm02.fra.techsolutions.de	          [PASS]
    Signing the cert for kvm02.fra.techsolutions.de	                  [PASS]
    Copying ca cert to kvm02.fra.techsolutions.de	                    [PASS]
    Copying vdsm cert to kvm02.fra.techsolutions.de	                  [PASS]
    Copying libvirt cert to kvm02.fra.techsolutions.de	              [PASS]
    Copying libvirt-spice cert to kvm02.fra.techsolutions.de	        [PASS]
    Copying libvirt-vnc cert to kvm02.fra.techsolutions.de	          [PASS]
    Disabling power management for kvm02.fra.techsolutions.de	        [PASS]
    Restarting services on kvm02.fra.techsolutions.de	                [PASS]
    Waiting for host to become Available                              [PASS]
    Enabling power management for kvm02.fra.techsolutions.de	        [PASS]
```

## Verify Certificate Renewal

After all Engine and KVM host certificates have been renewed, verify that the certificates display the expected expiration dates.

**OLVM Engine**

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts status

    reports.cer                                         Jan 18 17:58:22 2031 GMT
    kvm01.fra.techsolutions.de.cer                 		  Feb 13 19:35:58 2031 GMT
    ovn-ndb.cer                                         Jan 18 19:58:53 2031 GMT
    jboss.cer                                           Jan 18 17:58:21 2031 GMT
    ovirt-provider-ovn.cer                              Jan 18 19:59:47 2031 GMT
    vmconsole-proxy-host.cer                            Jan 18 19:31:58 2031 GMT
    websocket-proxy.cer                                 Jan 18 17:58:22 2031 GMT
    kvm02.fra.techsolutions.de.cer                 		  Feb 13 19:48:41 2031 GMT
    imageio-proxy.cer                                   Jan 18 17:58:22 2031 GMT
    engine.cer                                          Jan 18 17:58:21 2031 GMT
    apache.cer                                          Jan 18 17:58:22 2031 GMT
    ovn-sdb.cer                                         Jan 18 19:58:07 2031 GMT
    vmconsole-proxy-user.cer                            Jan 18 19:31:58 2031 GMT
    vmconsole-proxy-helper.cer                          Jan 18 19:21:27 2031 GMT
```

**KVM Host kvm01.fra.techsolutions.de** 

Verify the certificates on each KVM host.

Run the following command:

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts status kvm01.fra.techsolutions.de
    reports.cer                                         Jan 18 17:58:22 2031 GMT
    kvm01.fra.techsolutions.de.cer                      Feb 13 20:03:16 2031 GMT
    ovn-ndb.cer                                         Jan 18 19:58:53 2031 GMT
    jboss.cer                                           Jan 18 17:58:21 2031 GMT
    ovirt-provider-ovn.cer                              Jan 18 19:59:47 2031 GMT
    vmconsole-proxy-host.cer                            Jan 18 19:31:58 2031 GMT
    websocket-proxy.cer                                 Jan 18 17:58:22 2031 GMT
    kvm02.fra.techsolutions.de.cer                      Feb 13 20:00:15 2031 GMT
    imageio-proxy.cer                                   Jan 18 17:58:22 2031 GMT
    engine.cer                                          Jan 18 17:58:21 2031 GMT
    apache.cer                                          Jan 18 17:58:22 2031 GMT
    ovn-sdb.cer                                         Jan 18 19:58:07 2031 GMT
    vmconsole-proxy-user.cer                            Jan 18 19:31:58 2031 GMT
    vmconsole-proxy-helper.cer                          Jan 18 19:21:27 2031 GMT
```

**KVM Host kvm02.fra.techsolutions.de**

```console
[root@mgmt-olvm01 ~]# ./OlvmKvmCerts status kvm02.fra.techsolutions.de

    reports.cer                                         Jan 18 17:58:22 2031 GMT
    kvm01.fra.techsolutions.de.cer                      Feb 13 20:03:16 2031 GMT
    ovn-ndb.cer                                         Jan 18 19:58:53 2031 GMT
    jboss.cer                                           Jan 18 17:58:21 2031 GMT
    ovirt-provider-ovn.cer                              Jan 18 19:59:47 2031 GMT
    vmconsole-proxy-host.cer                            Jan 18 19:31:58 2031 GMT
    websocket-proxy.cer                                 Jan 18 17:58:22 2031 GMT
    kvm02.fra.techsolutions.de.cer                      Feb 13 20:00:15 2031 GMT
    imageio-proxy.cer                                   Jan 18 17:58:22 2031 GMT
    engine.cer                                          Jan 18 17:58:21 2031 GMT
    apache.cer                                          Jan 18 17:58:22 2031 GMT
    ovn-sdb.cer                                         Jan 18 19:58:07 2031 GMT
    vmconsole-proxy-user.cer                            Jan 18 19:31:58 2031 GMT
    vmconsole-proxy-helper.cer                          Jan 18 19:21:27 2031 GMT
```

## Summary
As shown in the final validation output, all certificates on the Engine host (mgmt-olvm01) and both KVM hosts have been successfully renewed and now display updated expiration dates extending to 2031.

The renewal was performed in a controlled manner—first on the Engine and then host by host—ensuring a smooth process without impacting running virtual machines.

Although the Oracle Linux Virtualization Manager certificate renewal script simplifies the procedure significantly, it is still recommended to follow a cautious approach in production environments.

Since OLVM 4.3 and 4.4 are no longer supported, it is strongly recommended to plan an upgrade to Oracle Linux Virtualization Manager 4.5 (the current latest release). Beyond improved certificate handling, version 4.5 includes important bug fixes, security updates, performance improvements, stability enhancements, and broader compatibility updates. Upgrading ensures continued vendor support and access to critical fixes that are no longer provided for older releases.

## References

- MOS Doc ID KB370896
- MOS Doc ID KB524781