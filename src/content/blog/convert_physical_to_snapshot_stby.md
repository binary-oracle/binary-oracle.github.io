---
title: "Convert a Physical Standby Database to a Snapshot Standby Using DGMGRL"
description: "Convert an Oracle Data Guard physical standby database to a snapshot standby and revert it back to a physical standby using DGMGRL in Oracle Database 19c."
pubDate: 2025-10-25
tags:
  - Oracle Database
  - Oracle Data Guard
  - Oracle Database 19c
  - DGMGRL
  - Physical Standby
  - Snapshot Standby
  - High Availability
---

This guide demonstrates how to convert an Oracle Data Guard **Physical Standby** database to a **Snapshot Standby** database and later convert it back to a physical standby using **DGMGRL**.

A snapshot standby database allows temporary read-write access to a physical standby database. This can be useful for testing, patch validation, reporting, or other activities that require a writable copy of the production database.

When the snapshot standby is converted back to a physical standby, any local changes made while the database was open in read-write mode are discarded. Redo received from the primary database is then applied to bring the standby database back into synchronization.

While the database operates as a snapshot standby, redo continues to be received from the primary database but is not applied. As a result, the snapshot standby gradually falls behind the primary until it is converted back to a physical standby.

## System Overview

The Data Guard configuration used in this example consists of one primary database and two physical standby databases:

| Server | Database | Role |
| --- | --- | --- |
| `server-graz` | `GRAZ` | Primary |
| `server-wien` | `WIEN` | Physical Standby |
| `server-tirol` | `TIROL` | Physical Standby |

The `TIROL` database will be converted from a physical standby to a snapshot standby.

Verify the current Data Guard configuration:

```text
DGMGRL> show configuration;

Configuration - stby

  Protection Mode: MaxPerformance
  Members:
  GRAZ  - Primary database
    WIEN  - Physical standby database
    TIROL - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 30 seconds ago)
```

## Convert a Physical Standby Manually

A physical standby database can also be converted manually without Data Guard Broker.

The general procedure is:

1. Stop Redo Apply if it is currently running.
2. Ensure that the standby database is mounted.
3. Verify that a Fast Recovery Area (FRA) is configured.
4. Convert the database to a snapshot standby.
5. Open the database in read-write mode.

Convert the database:

```sql
ALTER DATABASE CONVERT TO SNAPSHOT STANDBY;
```

Open the snapshot standby:

```sql
ALTER DATABASE OPEN READ WRITE;
```

## Convert the Physical Standby Using DGMGRL

Data Guard Broker can perform the conversion automatically.

Connect to DGMGRL:

```bash
[oracle@server-tirol admin]$ dgmgrl sys/*********
DGMGRL for Linux: Release 19.0.0.0.0 - Production on Sat Oct 25 18:33:34 2025
Version 19.28.0.0.0

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

Welcome to DGMGRL, type "help" for information.
Connected to "TIROL"
Connected as SYSDBA.
```

Verify the current Data Guard configuration:

```text
DGMGRL> show configuration;

Configuration - stby

  Protection Mode: MaxPerformance
  Members:
  GRAZ  - Primary database
    WIEN  - Physical standby database
    TIROL - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 59 seconds ago)
```

Convert `TIROL` to a snapshot standby:

```text
DGMGRL> convert database 'TIROL' to snapshot standby;
Converting database "TIROL" to a Snapshot Standby database, please wait...
Database "TIROL" converted successfully
```

Verify the Data Guard configuration:

```text
DGMGRL> show configuration;

Configuration - stby

  Protection Mode: MaxPerformance
  Members:
  GRAZ  - Primary database
    WIEN  - Physical standby database
    TIROL - Snapshot standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 47 seconds ago)
```

The broker now reports `TIROL` as a **Snapshot standby database**.

## Verify the Snapshot Standby Database

Connect to the `TIROL` database:

```bash
[oracle@server-tirol ~]$ sqlplus / as sysdba

SQL*Plus: Release 19.0.0.0.0 - Production on Sat Oct 25 18:35:45 2025
Version 19.28.0.0.0

Copyright (c) 1982, 2025, Oracle.  All rights reserved.

Connected to:
Oracle Database 19c Enterprise Edition Release 19.0.0.0.0 - Production
Version 19.28.0.0.0
```

Verify the database role and open mode:

```sql
SQL> select status,instance_name,database_role,open_mode
  2  from v$database,v$instance;

STATUS       INSTANCE_NAME    DATABASE_ROLE      OPEN_MODE
------------ ---------------- ------------------ --------------------
OPEN         TIROL            SNAPSHOT STANDBY   READ WRITE
```

Verify that:

- `DATABASE_ROLE` is `SNAPSHOT STANDBY`.
- `OPEN_MODE` is `READ WRITE`.

The snapshot standby database is now available for read-write operations.

## Verify the Snapshot Standby Restore Point

When Oracle converts a physical standby database to a snapshot standby, it creates a restore point that is used when converting the database back to a physical standby.

Verify the restore point:

```sql
SQL> set pages 400 lines 200
SQL> col time form a20
SQL> col name form a50

SQL> select name,
  2         scn,
  3         to_char(time,'dd.mm.yyyy hh24:mi:ss') as time
  4  from v$restore_point;

NAME                                               SCN TIME
-------------------------------------------------- ---------- --------------------
SNAPSHOT_STANDBY_REQUIRED_10/25/2025 18:33:51      1335709 25.10.2025 18:33:51
```

The restore point allows Oracle to discard changes made while the snapshot standby was open in read-write mode and return the database to its previous physical standby state.

## Convert the Snapshot Standby Back to a Physical Standby

When testing or other read-write activities are complete, convert the snapshot standby back to a physical standby database.

Any local changes made while the database was operating as a snapshot standby are discarded during this process.

Connect to DGMGRL from the primary database:

```bash
[oracle@server-graz ~]$ dgmgrl sys/*********
DGMGRL for Linux: Release 19.0.0.0.0 - Production on Sat Oct 25 19:09:27 2025
Version 19.28.0.0.0

Copyright (c) 1982, 2019, Oracle and/or its affiliates.  All rights reserved.

Welcome to DGMGRL, type "help" for information.
Connected to "GRAZ"
Connected as SYSDBA.
```

Verify the current configuration:

```text
DGMGRL> show configuration;

Configuration - stby

  Protection Mode: MaxPerformance
  Members:
  GRAZ  - Primary database
    WIEN  - Physical standby database
    TIROL - Snapshot standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 51 seconds ago)
```

Convert `TIROL` back to a physical standby database:

```text
DGMGRL> convert database 'TIROL' to physical standby;
Converting database "TIROL" to a Physical Standby database, please wait...
Oracle Clusterware is restarting database "TIROL" ...
Connected to "TIROL"
Continuing to convert database "TIROL" ...
Database "TIROL" converted successfully
```

## Verify the Physical Standby Conversion

Verify the Data Guard configuration:

```text
DGMGRL> show configuration;

Configuration - stby

  Protection Mode: MaxPerformance
  Members:
  GRAZ  - Primary database
    WIEN  - Physical standby database
    TIROL - Physical standby database

Fast-Start Failover:  Disabled

Configuration Status:
SUCCESS   (status updated 56 seconds ago)
```

Verify that:

- `GRAZ` remains the primary database.
- `WIEN` remains a physical standby database.
- `TIROL` has returned to the physical standby role.
- The Data Guard configuration reports `SUCCESS`.

After the conversion, Oracle discards the changes made while `TIROL` was operating as a snapshot standby and resumes applying the redo received from the primary database.

The snapshot standby conversion and reversion process is now complete.