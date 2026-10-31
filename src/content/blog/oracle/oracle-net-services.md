---
title: "Understanding Oracle Net Services: Database Services, Naming Methods, and Listener Registration"
description: "An overview of Oracle Net Services architecture, database connectivity, naming methods, and listener service registration in Oracle Database 19c."
pubDate: 2026-10-20
tags:
  - Oracle Database
  - Oracle 19c
  - Oracle Net Services
  - Oracle Listener
  - Database Connectivity
  - System Administration
---

Oracle Net Services provides the network infrastructure that enables client applications to establish connections to Oracle Database.

Database connectivity involves several identifiers, including the database name, instance name, service name, and net service name. Although these identifiers can share the same value, each serves a different purpose within the Oracle Database architecture.

This guide explains the fundamental components of Oracle Net Services, the differences between database and network identifiers, and the mechanisms used to register database services with the Oracle Net Listener.

## Overview

Oracle Net Services enables communication between Oracle Database clients and database servers.

When a client establishes a database connection, Oracle Net resolves a connection identifier into a connect descriptor containing the network address and requested database service.

The client contacts the Oracle Net Listener, which identifies an appropriate service handler and establishes or redirects the connection to the database server process.

The main components are:

- **Oracle Net Client:** Initiates the database connection.
- **Naming Method:** Resolves a connection identifier into a connect descriptor.
- **Connect Descriptor:** Specifies the network address and database service.
- **Oracle Net Listener:** Accepts incoming connection requests.
- **Database Service:** Represents a logical connection destination.
- **Database Instance:** Provides access to the database through memory structures and background processes.
- **Oracle Database:** Contains the physical database files.

A typical connection follows this sequence:

```text
Oracle Client
     |
     | Connect Identifier: SALESDB
     v
Naming Resolution (tnsnames.ora)
     |
     | HOST = dbserver.example.com
     | PORT = 1521
     | SERVICE_NAME = sales.example.com
     v
Oracle Net Listener
     |
     | Registered Service:
     | sales.example.com
     v
Dedicated Server Process
     |
     v
Oracle Database Instance
     |
     | INSTANCE_NAME = sales
     v
Oracle Database
     |
     | DB_NAME = sales
```

For a dedicated-server connection, the listener handles the initial connection establishment. Subsequent database communication normally takes place directly between the client and the dedicated server process.

## Environment

The examples in this guide use a single-instance Oracle Database 19c installation on Oracle Linux.

| Component | Value |
|---|---|
| Hostname | `dbserver.example.com` |
| Oracle Database | 19c |
| Database name | `sales` |
| Database unique name | `sales` |
| Instance name | `sales` |
| Oracle SID | `sales` |
| Database service | `sales.example.com` |
| TNS alias | `SALESDB` |
| Listener name | `LISTENER` |
| Listener port | `1521` |

The database uses a dedicated server connection model and dynamic service registration.

All names in this example are illustrative. The DNS domain `example.com` is used for documentation purposes.

## Oracle Database Identifiers

Oracle Database uses different identifiers to distinguish databases, instances, and network services.

Understanding these identifiers is important because they are often assigned identical values in single-instance environments.

### Oracle System Identifier (SID)

The Oracle System Identifier, or SID, identifies an Oracle instance on a particular host.

On Linux, the `ORACLE_SID` environment variable specifies the local Oracle instance used by database utilities.

```bash
[oracle@dbserver ~]$ export ORACLE_SID=sales
[oracle@dbserver ~]$ echo $ORACLE_SID
sales
```

The SID is used for local database connections.

For example:

```bash
[oracle@dbserver ~]$ sqlplus / as sysdba
```

This command establishes a local administrative connection using operating-system authentication.

A TCP listener is normally not required for this type of local connection.

The SID can also be identified from the PMON background process.

```bash
[oracle@dbserver ~]$ ps -ef | grep '[p]mon'
oracle  12345  1  0  ora_pmon_sales
```

The suffix of the PMON process name identifies the instance SID.

In this example:

```text
ORACLE_SID = sales
```

The SID is a local instance identifier. It is not automatically the service name used by remote clients.

### INSTANCE_NAME

The `INSTANCE_NAME` initialization parameter identifies the Oracle Database instance.

An instance consists of Oracle memory structures and background processes that manage access to the database.

Verify the instance name:

```sql
SQL> SHOW PARAMETER instance_name;
```

Example output:

```text
NAME           TYPE    VALUE
-------------- ------- ------
instance_name  string  sales
```

In a typical single-instance database, `INSTANCE_NAME` and `ORACLE_SID` use the same value.

However, they serve different purposes.

| Identifier | Purpose |
|---|---|
| `ORACLE_SID` | Identifies the local instance to operating-system tools |
| `INSTANCE_NAME` | Identifies the database instance within Oracle Database |

In Oracle Real Application Clusters (Oracle RAC), multiple instances can access the same database, each with its own instance name.

### DB_NAME

The `DB_NAME` initialization parameter identifies the Oracle database.

```sql
SQL> SHOW PARAMETER db_name;
```

Example:

```text
NAME      TYPE    VALUE
--------- ------- ------
db_name   string  sales
```

The database name identifies the database itself rather than a specific network connection.

A database and an instance are separate concepts.

The database consists of physical files, including datafiles, control files, and online redo log files.

The instance consists of memory structures and background processes used to access and manage those files.

In this example:

```text
DB_NAME       = sales
INSTANCE_NAME = sales
```

Both identifiers have the same value, but they represent different components.

### DB_UNIQUE_NAME

The `DB_UNIQUE_NAME` initialization parameter provides a unique name for the database.

```sql
SQL> SHOW PARAMETER db_unique_name;
```

Example:

```text
NAME            TYPE    VALUE
--------------- ------- ------
db_unique_name  string  sales
```

In a standalone database environment, `DB_UNIQUE_NAME` commonly has the same value as `DB_NAME`.

However, the parameters serve different purposes.

`DB_NAME` identifies the database name, while `DB_UNIQUE_NAME` provides a distinct database identity, particularly useful in environments containing multiple related databases.

The value of `DB_UNIQUE_NAME` does not determine the TNS alias or the database service requested by a client.

## Database Services

A database service is a logical representation of a database workload or connection destination.

Oracle Database clients typically connect to services rather than directly identifying database instances.

A service provides an abstraction between the client application and the underlying database instance.

For example, the database `sales` may provide a service named:

```text
sales.example.com
```

Applications connect to that service without needing to know the database instance SID.

A database can provide multiple services, such as:

```text
sales.example.com
sales_reporting.example.com
sales_batch.example.com
```

These services can represent different application workloads.

The services may be associated with the same database instance or, in multi-instance environments, with multiple instances.

### SERVICE_NAME

The `SERVICE_NAME` attribute in a connect descriptor specifies the database service requested by the client.

For example:

```ini
(CONNECT_DATA =
  (SERVICE_NAME = sales.example.com)
)
```

The client requests the service `sales.example.com` from the destination listener.

The listener must recognize that service through dynamic or static registration.

The service name does not need to match the database SID, instance name, or database name.

For example:

```text
DB_NAME       = sales
INSTANCE_NAME = sales
ORACLE_SID    = sales
SERVICE_NAME  = sales.example.com
```

This is a valid configuration.

### SERVICE_NAMES Initialization Parameter

Oracle Database also includes the `SERVICE_NAMES` initialization parameter.

```sql
SQL> SHOW PARAMETER service_names;
```

Historically, this parameter was used to specify database services.

However, **customer use of the `SERVICE_NAMES` initialization parameter is deprecated in Oracle Database 19c**.

Oracle recommends managing database services through supported service-management interfaces, such as:

- `SRVCTL` for Oracle Restart and Oracle RAC environments.
- `DBMS_SERVICE` for applicable database-managed services.
- `GDSCTL` for Global Data Services environments.

The `SERVICE_NAMES` initialization parameter and the `SERVICE_NAME` attribute in a client connect descriptor are different configuration elements.

The first relates to database-side service configuration, while the second identifies the service requested by a client.

## Oracle Net Naming Methods

Oracle Net supports several methods for resolving connection identifiers into connect descriptors.

A connect descriptor specifies the information required to reach a database service.

Oracle Database supports local naming, Easy Connect naming, directory naming, and external naming.

### Local Naming

Local naming uses the `tnsnames.ora` configuration file.

The file contains mappings between net service names and connect descriptors.

For example:

```ini
SALESDB =
  (DESCRIPTION =
    (ADDRESS =
      (PROTOCOL = TCP)
      (HOST = dbserver.example.com)
      (PORT = 1521)
    )
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = sales.example.com)
    )
  )
```

The client establishes a connection using:

```bash
[oracle@client ~]$ sqlplus appuser@SALESDB
```

Oracle Net resolves the alias `SALESDB` into the following connection information:

```text
HOST         = dbserver.example.com
PORT         = 1521
SERVICE_NAME = sales.example.com
```

The TNS alias is a client-side identifier and does not need to match the database SID or service name.

For example, the alias could also be named:

```text
PRODUCTION_DB
SALES_DATABASE
APPLICATION_DB
```

All of these names can reference the same database service.

For example:

```ini
PRODUCTION_DB =
  (DESCRIPTION =
    (ADDRESS =
      (PROTOCOL = TCP)
      (HOST = dbserver.example.com)
      (PORT = 1521)
    )
    (CONNECT_DATA =
      (SERVICE_NAME = sales.example.com)
    )
  )
```

The client would connect using:

```bash
sqlplus appuser@PRODUCTION_DB
```

The requested database service remains `sales.example.com`.

### Easy Connect Naming

Easy Connect allows clients to establish connections without defining a local TNS alias.

For example:

```bash
sqlplus appuser@//dbserver.example.com:1521/sales.example.com
```

The connection string specifies:

```text
Hostname     = dbserver.example.com
Listener Port = 1521
Service Name  = sales.example.com
```

Easy Connect is useful for administrative connections and environments where maintaining a local `tnsnames.ora` file is unnecessary.

Oracle Database 19c also supports Easy Connect Plus, which provides additional connection options.

### Directory Naming

Directory naming allows database connection identifiers to be resolved through a directory service.

This approach provides centralized management of database connection information and can reduce the need to maintain local naming files on individual client systems.

### External Naming

External naming allows Oracle Net to resolve connection identifiers through supported external naming services.

The available naming methods and their resolution order are controlled through Oracle Net configuration.

## Oracle Net Configuration Files

Oracle Net Services commonly uses three configuration files.

| File | Purpose |
|---|---|
| `tnsnames.ora` | Defines client-side net service names and connect descriptors |
| `listener.ora` | Configures listener endpoints and optional static service registration |
| `sqlnet.ora` | Configures Oracle Net client and server behavior |

### tnsnames.ora

The `tnsnames.ora` file is primarily used for client-side local naming.

A typical entry contains the following elements:

```ini
SALESDB =
  (DESCRIPTION =
    (ADDRESS =
      (PROTOCOL = TCP)
      (HOST = dbserver.example.com)
      (PORT = 1521)
    )
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = sales.example.com)
    )
  )
```

| Parameter | Description |
|---|---|
| `SALESDB` | Net service name used by the client |
| `DESCRIPTION` | Groups the connection information |
| `ADDRESS` | Defines the destination network address |
| `PROTOCOL` | Specifies the network protocol |
| `HOST` | Identifies the database server |
| `PORT` | Specifies the listener port |
| `CONNECT_DATA` | Contains connection-specific attributes |
| `SERVER` | Requests a dedicated or shared server connection mode |
| `SERVICE_NAME` | Identifies the requested database service |

### listener.ora

The `listener.ora` file defines the network endpoints on which the listener accepts connections.

For example:

```ini
LISTENER =
  (DESCRIPTION_LIST =
    (DESCRIPTION =
      (ADDRESS =
        (PROTOCOL = TCP)
        (HOST = dbserver.example.com)
        (PORT = 1521)
      )
      (ADDRESS =
        (PROTOCOL = IPC)
        (KEY = EXTPROC1521)
      )
    )
  )
```

The listener can accept connections for multiple database services.

Normal database services can be registered dynamically without requiring static instance entries in `listener.ora`.

### sqlnet.ora

The `sqlnet.ora` file configures Oracle Net behavior.

For example:

```ini
NAMES.DIRECTORY_PATH = (TNSNAMES, EZCONNECT)
```

This configuration specifies the naming methods used to resolve database connection identifiers.

Other Oracle Net parameters control authentication, encryption, tracing, and network behavior.

### Configuration File Locations

Oracle Net configuration files are commonly located in:

```text
$ORACLE_HOME/network/admin
```

The `TNS_ADMIN` environment variable can specify an alternative configuration directory.

```bash
[oracle@dbserver ~]$ echo $TNS_ADMIN
```

In Oracle Restart or Oracle Grid Infrastructure environments, the listener may be managed from the Grid Infrastructure home rather than the database Oracle home.

The active configuration location should therefore be verified before modifying listener settings.

## Oracle Net Listener

The Oracle Net Listener is a server-side process that accepts incoming database connection requests.

A listener can support multiple database services and instances.

The listener is commonly configured to accept TCP connections on port `1521`.

Verify the listener status:

```bash
[oracle@dbserver ~]$ lsnrctl status
```

Example output:

```text
Services Summary...

Service "sales.example.com" has 1 instance(s).
  Instance "sales", status READY, has 1 handler(s) for this service...
```

The output indicates that the listener recognizes the service `sales.example.com`, which is associated with the instance `sales`.

For more detailed information about registered services and handlers:

```bash
lsnrctl services
```

Database services are made available to the listener through dynamic or static registration.

## Dynamic Service Registration

Dynamic service registration allows Oracle Database to register its services automatically with the listener.

In Oracle Database 19c, service registration is performed by the **Listener Registration (LREG)** background process.

LREG provides the listener with information about available services, database instances, and service handlers.

For example:

```text
Service "sales.example.com" has 1 instance(s).
  Instance "sales", status READY
```

The `READY` status indicates that the instance is available to accept connections for the registered service.

Dynamic registration is the standard method for normal database connectivity.

It does not require manually defining the database instance in `SID_LIST_LISTENER`.

### LOCAL_LISTENER

The `LOCAL_LISTENER` initialization parameter identifies the local listener endpoint used for registration.

Verify its configuration:

```sql
SQL> SHOW PARAMETER local_listener;
```

For the default listener configuration using TCP port `1521`, Oracle Database may register automatically without an explicitly configured `LOCAL_LISTENER` value.

For nondefault listener configurations, an explicit address may be required.

For example:

```sql
ALTER SYSTEM SET LOCAL_LISTENER =
  '(ADDRESS=(PROTOCOL=TCP)(HOST=dbserver.example.com)(PORT=1521))'
  SCOPE=BOTH;
```

This is an example of a directly specified listener address. The existing Oracle Restart or database configuration should be considered before changing this parameter.

### Force Service Registration

Service registration can be requested manually using:

```sql
SQL> ALTER SYSTEM REGISTER;
```

Then verify:

```bash
lsnrctl services
```

The LREG background process normally handles registration automatically, so manual registration is primarily useful during configuration and troubleshooting.

## Static Service Registration

Static service registration defines database instance information manually in the listener configuration.

Unlike dynamic registration, static registration does not depend on the database instance advertising its services through LREG.

Static registration is useful for certain administrative operations that require remote connections when the database is not fully available.

Examples include remote instance startup and RMAN auxiliary database connections.

### Configure Static Registration

The following entry can be added to `listener.ora`:

```ini
SID_LIST_LISTENER =
  (SID_LIST =
    (SID_DESC =
      (GLOBAL_DBNAME = sales_static.example.com)
      (SID_NAME = sales)
      (ORACLE_HOME = /u01/app/oracle/product/19/dbhome_1)
    )
  )
```

The static service `sales_static.example.com` is associated with the local instance SID `sales`.

| Parameter | Description |
|---|---|
| `SID_LIST_LISTENER` | Defines static registrations for the listener named `LISTENER` |
| `SID_DESC` | Defines a statically configured instance |
| `GLOBAL_DBNAME` | Specifies the advertised static service name |
| `SID_NAME` | Identifies the local Oracle instance SID |
| `ORACLE_HOME` | Identifies the Oracle software home for the instance |

The service name and instance SID do not need to match.

For example:

```text
GLOBAL_DBNAME = sales_static.example.com
SID_NAME      = sales
```

The listener advertises the service `sales_static.example.com` and associates it with the local instance `sales`.

### Connect Using the Static Service

Define a client-side alias:

```ini
SALES_STATIC =
  (DESCRIPTION =
    (ADDRESS =
      (PROTOCOL = TCP)
      (HOST = dbserver.example.com)
      (PORT = 1521)
    )
    (CONNECT_DATA =
      (SERVER = DEDICATED)
      (SERVICE_NAME = sales_static.example.com)
    )
  )
```

Connect using:

```bash
sqlplus sys@SALES_STATIC as sysdba
```

The requested service name matches the `GLOBAL_DBNAME` configured in the static listener entry.

### Verify Static Registration

Reload the listener:

```bash
lsnrctl reload LISTENER
```

Verify the registered services:

```bash
lsnrctl services LISTENER
```

Example:

```text
Service "sales_static.example.com" has 1 instance(s).
  Instance "sales", status UNKNOWN
```

The `UNKNOWN` status is expected for a statically registered instance.

It indicates that the listener does not determine the current database instance state through that static registration.

It does not necessarily indicate a database failure.

Static registration also does not guarantee that the instance is running or that database authentication will succeed.

## Static and Dynamic Registration Comparison

| Characteristic | Dynamic Registration | Static Registration |
|---|---|---|
| Registration source | Database instance | `listener.ora` |
| Registration mechanism | LREG background process | Manual configuration |
| Typical listener status | `READY` | `UNKNOWN` |
| Requires `SID_LIST_LISTENER` | No | Yes |
| Service information | Updated dynamically | Manually maintained |
| Common use | Normal database connections | Administrative connections |
| Instance availability information | Reported dynamically | Not determined from static entry |

Both registration methods can coexist in the same listener.

For example:

```text
Services Summary...

Service "sales.example.com" has 1 instance(s).
  Instance "sales", status READY

Service "sales_static.example.com" has 1 instance(s).
  Instance "sales", status UNKNOWN
```

Both services refer to the same database instance.

The difference is how the services were registered with the listener.

## Relationship Between TNS Alias, Service Name, and SID

The relationship between the identifiers can be demonstrated using the static service configuration.

Client-side `tnsnames.ora`:

```ini
SALES_STATIC =
  (DESCRIPTION =
    (ADDRESS =
      (PROTOCOL = TCP)
      (HOST = dbserver.example.com)
      (PORT = 1521)
    )
    (CONNECT_DATA =
      (SERVICE_NAME = sales_static.example.com)
    )
  )
```

Server-side `listener.ora`:

```ini
SID_LIST_LISTENER =
  (SID_LIST =
    (SID_DESC =
      (GLOBAL_DBNAME = sales_static.example.com)
      (SID_NAME = sales)
      (ORACLE_HOME = /u01/app/oracle/product/19/dbhome_1)
    )
  )
```

The connection follows this sequence:

```text
Client
  |
  | SALES_STATIC
  v
tnsnames.ora
  |
  | HOST = dbserver.example.com
  | PORT = 1521
  | SERVICE_NAME = sales_static.example.com
  v
Oracle Net Listener
  |
  | GLOBAL_DBNAME = sales_static.example.com
  | SID_NAME = sales
  v
Oracle Instance
  |
  | ORACLE_SID = sales
  v
Oracle Database
```

The identifiers have distinct responsibilities.

| Identifier | Value | Purpose |
|---|---|---|
| TNS alias | `SALES_STATIC` | Client-side connection identifier |
| `SERVICE_NAME` | `sales_static.example.com` | Requested database service |
| `GLOBAL_DBNAME` | `sales_static.example.com` | Advertised static listener service |
| `SID_NAME` | `sales` | Local instance identifier |
| `ORACLE_SID` | `sales` | Local Oracle instance selection |

The TNS alias can be renamed without changing the underlying database instance or service registration.

The service requested by the client must be recognized by the destination listener.

## SERVICE_NAME Versus SID Connections

Oracle Net supports different ways to identify a database connection destination.

### Service-Based Connection

A service-based connection specifies a logical database service.

```ini
(CONNECT_DATA =
  (SERVICE_NAME = sales.example.com)
)
```

Service-based connections are generally preferred for application connectivity because they provide abstraction from individual database instances.

### SID-Based Connection

A SID-based connection identifies a particular Oracle instance.

```ini
(CONNECT_DATA =
  (SID = sales)
)
```

SID-based connections are supported in appropriate configurations but are less flexible than service-based connections.

They may be encountered in legacy applications or administrative environments.

### Instance-Specific Service Connection

A connect descriptor can also identify a particular instance associated with a service.

For example:

```ini
(CONNECT_DATA =
  (SERVICE_NAME = sales.example.com)
  (INSTANCE_NAME = sales1)
)
```

This is primarily useful in multi-instance database environments where a connection must target a specific instance.

## Verify Oracle Net Connectivity

Oracle Net connectivity should be tested in stages.

### Verify the Oracle Environment

```bash
echo $ORACLE_HOME
echo $ORACLE_SID
echo $TNS_ADMIN
```

Example:

```text
/u01/app/oracle/product/19/dbhome_1
sales
```

An empty `TNS_ADMIN` value is normal when Oracle Net uses its default configuration location.

### Verify the TNS Alias

```bash
tnsping SALESDB
```

Example:

```text
Used TNSNAMES adapter to resolve the alias

Attempting to contact
(DESCRIPTION =
  (ADDRESS =
    (PROTOCOL = TCP)
    (HOST = dbserver.example.com)
    (PORT = 1521)
  )
  (CONNECT_DATA =
    (SERVICE_NAME = sales.example.com)
  )
)

OK (0 msec)
```

The output confirms that Oracle Net resolved the alias and reached the listener endpoint.

However, `tnsping` does not verify that the requested service is registered or that database authentication succeeds.

### Verify Listener Services

On the database server:

```bash
lsnrctl services
```

Verify that the requested service appears in the output.

For example:

```text
Service "sales.example.com" has 1 instance(s).
  Instance "sales", status READY
```

### Verify the Database Connection

Use SQL*Plus to establish an actual database connection.

```bash
sqlplus appuser@SALESDB
```

Alternatively, use Easy Connect:

```bash
sqlplus appuser@//dbserver.example.com:1521/sales.example.com
```

A successful connection verifies that the requested service is available and that the supplied database credentials are accepted.

## Common Oracle Net Errors

### ORA-12154: Could Not Resolve Connect Identifier

Oracle Net could not resolve the supplied connection identifier.

Common causes include:

- Missing or incorrectly defined TNS alias
- Invalid `tnsnames.ora` syntax
- Incorrect configuration file location
- Naming-method configuration issues

Verify the alias using:

```bash
tnsping SALESDB
```

### ORA-12514: Listener Does Not Know Requested Service

The listener is reachable but does not recognize the requested database service.

For example, the client requests:

```ini
SERVICE_NAME = incorrect.example.com
```

But the listener only advertises:

```text
sales.example.com
```

Verify the listener services:

```bash
lsnrctl services
```

The requested `SERVICE_NAME` must identify a service recognized by the destination listener.

### ORA-12505: Listener Does Not Know Requested SID

This error commonly occurs when a SID-based connection requests an instance SID that the listener does not recognize.

For example:

```ini
(CONNECT_DATA =
  (SID = incorrect_sid)
)
```

Verify the instance SID and listener configuration.

### ORA-12541: No Listener

The client could not contact a listener at the specified network address.

Verify the listener status:

```bash
lsnrctl status
```

Also check the configured hostname, port, and network connectivity.

## Configuration Recommendations

Use consistent naming conventions for database instances, database services, and client connection identifiers.

Prefer service-based connections for applications and database administration.

Use dynamic service registration for normal database connectivity. Configure static registration when required for specific administrative operations.

In Oracle Database 19c, manage database services through supported Oracle service-management tools rather than manually configuring the deprecated `SERVICE_NAMES` initialization parameter.

When using Oracle Restart or Oracle Grid Infrastructure, verify which Oracle home manages the listener before modifying configuration files.

Use `lsnrctl services` to verify service registration and SQL*Plus to validate actual database connectivity.

Do not rely solely on `tnsping`, because successful name resolution and listener reachability do not guarantee that the requested database service is available.

## Summary

Oracle Net Services separates database identity, instance identity, and network connectivity into distinct components.

| Identifier | Purpose | Example |
|---|---|---|
| `ORACLE_SID` | Local Oracle instance identifier | `sales` |
| `INSTANCE_NAME` | Database instance name | `sales` |
| `DB_NAME` | Oracle database name | `sales` |
| `DB_UNIQUE_NAME` | Unique database identifier | `sales` |
| Database service | Logical connection destination | `sales.example.com` |
| TNS alias | Client-side connection identifier | `SALESDB` |
| `GLOBAL_DBNAME` | Statically advertised service | `sales_static.example.com` |
| `SID_NAME` | Local instance identifier in static registration | `sales` |

The key relationships are:

- A TNS alias resolves to a connect descriptor.
- A connect descriptor identifies a network endpoint and requested service.
- The listener must recognize the requested database service.
- Database services are associated with database instances.
- Dynamic registration is performed by LREG.
- Static registration is configured through `listener.ora`.
- The TNS alias, service name, database name, and instance SID do not need to have identical values.

Understanding these components provides the foundation for configuring and troubleshooting Oracle Database connectivity.

## References

The following official Oracle Database 19c documentation provides additional information.

1. [Oracle Database Net Services Administrator's Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/netag/)
2. [Oracle Database Net Services Reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/netrf/)
3. [Oracle Database Reference — Initialization Parameters](https://docs.oracle.com/en/database/oracle/oracle-database/19/refrn/)
4. [Oracle Database Administrator's Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/)
