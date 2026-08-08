---
title: "Configure Passwordless SSH Authentication Using SSH Keys"
description: "Learn how to configure passwordless SSH authentication between Linux servers using public and private SSH keys."
pubDate: 2025-11-02
tags:
  - Linux
  - SSH
  - Security
  - Oracle Linux
  - System Administration
---

This guide describes how to configure passwordless SSH authentication between two Linux systems using SSH public and private key pairs.

SSH key-based authentication provides a secure and efficient alternative to password-based logins. Once configured, users can authenticate to remote systems without entering a password for each connection.

## Overview

SSH key authentication uses a public and private key pair to authenticate users without transmitting passwords over the network.

The private key remains on the local system, while the public key is copied to each remote server. During authentication, SSH verifies the key pair instead of prompting for a password.

For additional security, the private key can be protected with a passphrase.

## Environment

This example configures passwordless SSH authentication between two Oracle Linux servers.

| Hostname | Purpose |
|----------|---------|
| `server-graz` | Source server |
| `server-wien` | Destination server |

Once the configuration is complete, each server can establish SSH connections to the other without requiring password authentication.

## Verify Password-Based Authentication

Before configuring SSH keys, verify that the connection requires password authentication.

```console
[root@server-graz ~]# ssh server-wien
root@server-wien's password:
```

## Generate an SSH Key Pair

Generate an SSH key pair on **server-graz**. In this example, the private key is created without a passphrase.

```console
[root@server-graz ~]# ssh-keygen
Generating public/private rsa key pair.
Enter file in which to save the key (/root/.ssh/id_rsa):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /root/.ssh/id_rsa
Your public key has been saved in /root/.ssh/id_rsa.pub
The key fingerprint is:
SHA256:Vp/109X0La3LEwuCpTIvX3ZX5fmPIH5JtcR6NhtjxrE root@server-graz
The key's randomart image is:
+---[RSA 3072]----+
|                .|
|               o+|
|          o  .o B|
|         = . o===|
|      o S . +=o*=|
|       =   .ooE=o|
|      . . +.o**=.|
|       o + ooo.o.|
|        . ..  . .|
+----[SHA256]-----+
```

### Verify the Generated Keys

After the key pair has been created, verify that both files exist in the `~/.ssh` directory.

```console
[root@server-graz ~]# ls -ltra /root/.ssh/
total 24
dr-xr-x---. 3 root root 4096 Oct 25 14:37 ..
-rw-------. 1 root root  925 Oct 25 14:56 known_hosts.old
-rw-------. 1 root root 1665 Oct 25 14:57 known_hosts
-rw-r--r--. 1 root root  570 Nov  2 12:44 id_rsa.pub
-rw-------. 1 root root 2602 Nov  2 12:44 id_rsa
drwx------. 2 root root 4096 Nov  2 12:44 .
```

> - `id_rsa` is the private key and must never be shared.
> - `id_rsa.pub` is the public key and is copied to remote hosts.

## Copy the Public Key to the Remote Host

Copy the public key to **server-wien** using `ssh-copy-id`.

```console
[root@server-graz ~]# ssh-copy-id root@server-wien
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_rsa.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@server-wien's password:

Number of key(s) added: 1

Now try logging into the machine, with:
"ssh 'root@server-wien'" and check to make sure that only the key(s) you wanted were added.
```
Verify that passwordless authentication is working by establishing an SSH connection.

```console
[root@server-graz ~]# ssh server-wien
Last login: Sun Nov  2 12:40:21 2025 from 192.168.56.1
[root@server-wien ~]#
```

Repeat the same procedure on **server-wien** to enable passwordless SSH access to **server-graz**.

```console
[root@server-wien ~]# ssh key-gen
ssh: Could not resolve hostname key-gen: Name or service not known

[root@server-wien ~]# ssh-keygen
Generating public/private rsa key pair.
Enter file in which to save the key (/root/.ssh/id_rsa):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /root/.ssh/id_rsa
Your public key has been saved in /root/.ssh/id_rsa.pub
The key fingerprint is:
SHA256:m+Wq6/4GFCfWUInXUGtiFoWuSCsbE59Equ2fab/OpiA root@server-wien
The key's randomart image is:
+---[RSA 3072]----+
|      .=+Bo      |
|    . = *...     |
|   o . *+ o      |
|  o o .o.o       |
| o = = .S .      |
|. = = o  =       |
|E..=   .o .      |
| .o..+. ..       |
|   o=BX*o        |
+----[SHA256]-----+

[root@server-wien ~]# ssh-copy-id root@server-graz
/usr/bin/ssh-copy-id: INFO: Source of key(s) to be installed: "/root/.ssh/id_rsa.pub"
/usr/bin/ssh-copy-id: INFO: attempting to log in with the new key(s), to filter out any that are already installed
/usr/bin/ssh-copy-id: INFO: 1 key(s) remain to be installed -- if you are prompted now it is to install the new keys
root@server-graz's password:

Number of key(s) added: 1

Now try logging into the machine, with:
"ssh 'root@server-graz'"

and check to make sure that only the key(s) you wanted were added.

[root@server-wien ~]# ssh server-graz
Last login: Sun Nov  2 12:40:10 2025 from 192.168.56.1
[root@server-graz ~]#
```

## Security Considerations

It's important to note that **only the public key is intended to be shared**. The private key must always remain secure on your local system. If someone gains access to your private key, they can authenticate to any server where the corresponding public key is authorized.

If you ever suspect that your private key has been compromised, you should immediately **revoke and replace the key pair**. This involves removing the old public key from all authorized systems, generating a new key pair using `ssh-keygen`, and deploying the new public key to each remote host.

There are situations where using a key **without a passphrase** is acceptable or even required—for example, during the installation of Oracle Grid Infrastructure, where passwordless SSH configuration is mandatory for communication between cluster nodes.

However, a **passphrase-protected private key** adds an extra layer of security, as the passphrase must be entered each time the key is used. While this slightly reduces convenience, it protects the key from unauthorized use if it's ever copied or stored on removable media.

If you frequently work from multiple client systems or maintain backups of your keys, it's highly recommended to secure your private key with a passphrase.