---
title: "Using Proxy Users in Oracle Database"
description: "How to configure and use proxy users in Oracle Database for secure administration and shared schema access."
pubDate: 2025-06-30
tags:
  - Oracle
  - Security
  - Administration
  - Proxy User
---

Proxy authentication allows one database user to establish a session on behalf of another user without requiring the target user's password.

This feature is commonly used for administrative tasks, shared application schemas, and auditing, where users authenticate with their own credentials while operating under a different schema.

## Typical Use Cases

- **DBA tasks without passwords** – Perform administrative operations (like creating private database links or jobs with `DBMS_JOB`) under a specific user account without needing to know or share that account's password.

- **Shared schema access for teams** – Allow multiple developers to work in the same schema using their own proxy accounts instead of sharing a single set of credentials.

- **Auditing and accountability** – Track individual actions inside a shared schema, since each user connects with their own credentials through the proxy.

## Configure Proxy Authentication

This example configures proxy authentication for the `EDS` schema by creating a dedicated proxy account named `PROXY_USER`.

### 1. Verify the target user

Run the following query:
```sql
col username form a20

select username
from dba_users
where username like upper('%eds%')
   or username like upper('%meris%');
```

Expected output:

```sql
USERNAME
--------
EDS
```

### 2. Create the proxy user

```sql
create user proxy_user identified by passw0rd;
grant connect to proxy_user;
```

### 3. Grant proxy authentication
```sql
alter user EDS grant connect through proxy_user;
```

> Granting `CONNECT THROUGH` allows `PROXY_USER` to authenticate as `EDS`. The password of the `EDS` account is not shared with the proxy user.

### 4. Connect through the proxy user
```sql
sqlplus proxy_user[EDS]/passw0rd

SQL> show user
USER is "EDS"

set pages 400 lines 200
col session_user form a20
col session_schema form a20
col current_schema form a20
col proxy_user form a20
select sys_context('userenv','session_user') as session_user,
sys_context('userenv','session_schema') as session_schema,
sys_context('userenv','current_schema') as current_schema,
sys_context('userenv','proxy_user') as proxy_user
from dual;

SESSION_USER         SESSION_SCHEMA       CURRENT_SCHEMA       PROXY_USER
-------------------- -------------------- -------------------- --------------------
EDS                  EDS                  EDS                  PROXY_USER
```

## Verify Active Proxy Sessions

You can identify proxy sessions by querying `V$SESSION` together with `V$SESSION_CONNECT_INFO`.

```sql
col username form a20
col osuser form a20

SELECT a.sid,
       a.serial#,
       a.username,
       a.osuser,
       b.authentication_type
FROM   v$session a,
       v$session_connect_info b
WHERE  a.sid = b.sid
AND    a.serial# = b.serial#
AND    b.authentication_type = 'PROXY';

SID    SERIAL# USERNAME             OSUSER               AUTHENTICATION_TYPE
-----  ------- -------------------- -------------------- -------------------
108    15998   EDS                  oracle               PROXY
108    15998   EDS                  oracle               PROXY
108    15998   EDS                  oracle               PROXY
108    15998   EDS                  oracle               PROXY
```

## Summary

Proxy authentication enables users to connect through another database account without sharing the target user's password. This approach simplifies administration, improves auditing, and allows multiple users to work with shared schemas while maintaining individual accountability.