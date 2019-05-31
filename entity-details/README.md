# Entity Details
This tbutil script is meant to fetch statistics and aspects for any entity type in Turbonomic.

There are several options which allow you to specify which aspects or statistics you wish to
report on, as well as limiting the scope to a group or environment. See the usage details
for more.

## Usage
Usage is ..

  tbscript [{cred}] entity-detail.js [-h]
    [-a {aspects} (A comma separated list of Turbo aspects to include. 'all' will include every available aspect. default: unset, resulting in no aspects)]
    [-t {entity_types} (A comma separated list of Turbo entity types to report on. default: VirtualMachine)]
    [-d {number_of_days} (default: 30)]
    [-s {scope} (A unique ID of a group or market. default: Market)]
    [-e {environment} (default: HYBRID)]
    [-n {stat_names} (A comma separated list of Turbo stats to include. 'all' will include every available stat. default: unset, resulting in no stats)]
    [-l {limit} (default: unset, resulting in all available VMs matching the environment and scope)]
    [-f {output_file} (Will be formated according to file extension. I.E. .csv, .txt, .xlsx)]


## Output
The details discovered for each entity will be output either to a file with the extension and format specified by the `-f` parameter, or as a text table to STDOUT.

The output will always have the UUID and display name of the entity as the first two columns.

If aspects were specified with the `-a` parameter, all found aspects will appear in the following columns.

If stats were specified with the `-n` parameter, 5 columns for each found stat will appear in the following columns.
To understand the 5 columns which are created for each stat, it is useful to consider the API response for statistics. Here is a single record of statistical data from a single VirtualMachine entity. This is the Mem stat, indicating how much memory was "bought" from the host.

```
{
  "displayName": "Mem/rjg-opsmgr-6.3.0",
  "name": "Mem",
  "capacity": {
    "max": 536835744,
    "min": 536835744,
    "avg": 536835744,
    "total": 536835744
  },
  "filters": [
    {
      "type": "relation",
      "value": "bought"
    }
  ],
  "relatedEntity": {
    "uuid": "38353036-3936-4d32-3230-32373034314c",
    "displayName": "hp-dl392.demo.vmturbo.com",
    "className": "PhysicalMachine"
  },
  "units": "KB",
  "values": {
    "max": 16472224,
    "min": 16469355,
    "avg": 16469355,
    "total": 16469355
  },
  "value": 16469355
}
```

There will be one of these records for every hour during the time period specified. For 30 days, there would be 24 x 30 = 720 of these records.


The 5 columns for each stat in the output are;
* <statname>_<stat unit>_avg - This is the sum of values.avg from every record in the API response, divided by the number of records.
* <statname>_<stat unit>_peak - This is the highest values.max value observed across all records in the API response.
* <statname>_<stat unit>_capacity - This is the sum of capacity.total from every record in the API response, divided by the number of records.
* <statname>_<stat unit>_avg_percent_utilized - This is the average value above, divided by the capacity value above
* <statname>_<stat unit>_peak_percent_utilized - This is the peak value above, divided by the capacity value above

## TODO
* Provide separate flags for "bought" and "sold" stats
* Allow the user to specify which value(s) they'd like for any given stat (avg, peak, capacity, avg-percent-of-capacity, peak-percent-of-capacity)
* Allow the user to specify related entities to include. I.E. The VM for a DatabaseServer.
