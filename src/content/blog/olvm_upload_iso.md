---
title: "Upload an ISO to an OLVM Storage Domain Using the SDK"
description: "Upload an ISO image to an Oracle Linux Virtualization Manager (OLVM) storage domain using the Python SDK when the web interface upload option is unavailable."
pubDate: 2025-06-08
tags:
- OLVM
- Oracle Linux Virtualization Manager
- ISO
---

## Overview

This document describes how to upload an ISO image to an Oracle Linux Virtualization Manager (OLVM) storage domain using the Python SDK.

This procedure is intended for environments where the ISO upload option is unavailable in the OLVM web interface. It applies to **OLVM 4.4** and **OLVM 4.5**.

> Use the fully qualified domain name (FQDN) of the OLVM Manager when configuring the SDK. Using an IP address is not supported.


##### Prerequisites

Before beginning, ensure that:

- The OLVM Manager can be reached using its FQDN.
- The user has administrative privileges.
- The ISO file is available on the local system.

##### 1. Verify the SDK Installation

Run the following command:

```bash
rpm -qa | grep python3-ovirt-engine
```

Example output:

```text
python3-ovirt-engine-sdk4-4.6.2-2.el8.x86_64
```

If the package is not installed, install the required packages.

Run the following command:

```bash
dnf install python3-ovirt-engine-sdk4 ovirt-imageio-client -y
```

---

##### 2. Prepare the SDK Configuration

Create the configuration directory used to store the SDK certificate.

Run the following command:

```bash
mkdir -p /root/.config
```

Copy the OLVM CA certificate to the configuration directory.

Run the following command:

```bash
scp olvm-engine:/etc/pki/ovirt-engine/ca.pem /root/.config/
```

---

##### 3. Configure the SDK Connection

Create the configuration file.

Example:

```ini
[root@OLVM1 .config]# cat ovirt.conf

[isoupload]
engine_url = https://OLVMM.amm.at
username = admin@internal
password = ADMIN-PASSWORD
cafile = /root/.config/ca.pem
```

The alias (`isoupload` in this example) can be replaced with any descriptive name.

Verify the configuration directory.

Run the following command:

```bash
pwd
```

Example output:

```text
/root/.config
```

---

##### 4. List the Available Storage Domains

Run the following command:

```bash
python3 /usr/share/doc/python3-ovirt-engine-sdk4/examples/list_storage_domains.py -c isoupload
```

Example output:

```json
[
  {
    "name": "SRV1",
    "id": "2388112a-fa1c-4473-b312-59ff43f69d91",
    "type": "data"
  },
  {
    "name": "SRV2",
    "id": "2e5092c1-0889-4c51-b06d-324be29b03a4",
    "type": "data"
  },
  {
    "name": "SRV3",
    "id": "249efcd1-3303-425f-a774-735e997e8533",
    "type": "data"
  },
  {
    "name": "ovirt-image-repository",
    "id": "072fbaa1-08f3-4a40-9f34-a5ca22dd1d74",
    "type": "image"
  }
]
```

Record the name of the storage domain that will receive the ISO image.

---

##### 5. Upload the ISO Image

Run the following command:

```bash
python3 /usr/share/doc/python3-ovirt-engine-sdk4/examples/upload_disk.py \
-c isoupload \
--sd-name SRV1 \
--debug \
/root/win_iso/winvirtio.iso
```

Example output:

```text
[   0.0 ] Checking image...
[   0.0 ] Image format: raw
[   0.0 ] Disk format: raw
[   0.0 ] Disk content type: iso
[   0.0 ] Disk provisioned size: 82415616
[   0.0 ] Disk initial size: 82415616
[   0.0 ] Disk name: winvirtio.iso
[   0.0 ] Disk backup: False
[   0.0 ] Connecting...
[   0.0 ] Creating disk...
[  16.5 ] Disk ID: be2f8391-9e0a-4675-8242-e7c89b6f58ba
[  16.5 ] Creating image transfer...
[  18.2 ] Transfer ID: a9e586b1-dc49-4c46-b166-be96974699d1
[  18.2 ] Transfer host name: OLVM1
[  18.2 ] Uploading image...
[ 100% ] 78.60 MiB, 0.38 s, 205.33 MiB/s
[  18.6 ] Finalizing image transfer...
[  25.2 ] Upload completed successfully
```

---

## Verify the Result

Verify that the upload completed successfully.

The command should finish with the following message:

```text
Upload completed successfully
```

You can also verify that the ISO image is available in the selected storage domain from the OLVM Administration Portal.

---

## Reference

- Oracle Support Document **2967510.1**