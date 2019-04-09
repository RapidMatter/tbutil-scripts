# Generate BareMetal File
This tbutil script will extract VMs from a realtime, or topology instance of Turbonomic OpsMgr, and present it in the form of a ["BareMetal" target file](https://turbonomic.com/wp-content/uploads/2019/03/TargetConfiguration_6.3.1.pdf#page=17&zoom=100,0,526).

This can be useful to summarize the VMs basic attributes, and can be used to perform a low fidelity cloud migration plan when it is not possible to connect cloud targets to the realtime OpsMgr.

Note that at the time of this writing (April 2019, circa Turbonomic 6.3.x), there is a conflict between the baremetal documentation linked above, and the actual implementation. Namely the utilization percentage is shown as an ordinal number, rather than a decimal percentage. I.E. 10% == 10.0, not 10% == 0.1 as the documentation states.

## Usage
There are a few options available when running the BareMetal file generator.

Here is the CLI usage output;
```
$ tbutil -s generate_baremetal_file.js -h
Usage is ..

  tbscript [{cred}] generate_baremetal_file.js [-h]
    [-d {number_of_days} (default: 30)]
    [-s {scope} (A unique ID of a group or market. default: Market)]
    [-e {environment} (default: HYBRID)]
    [-l {limit} (default: unset, resulting in all available VMs matching the environment and scope)]
    [-p A flag, when set the resulting file will be based on peak utilization values for each VM. (default: true)]
    [-a A flag, when set the resulting file will be based on average utilization values for each VM. (default: false)]
```

### Default settings
If you do not specify any parameters, this script will;
* Find all VMs in all environments (HYBRID) for the default market/group (Market)
* Fetch statistics for the last 30 days
* Provide utilization values based on the peak-of-peaks

This is equivalent to running the script thusly;
`$ tbutil -s generate_baremetal_file.js -d 30 -s Market -e HYBRID -p`

### Utilization
You can choose to populate the "utilization" properties (see [Output](#output) below) with either the "average" utilization, or the peak-of-peaks utilization.

This example is equivalent to the default (not providing either the `-p` or `a` flags) behavior, and will populate the utilization values with the peak-of-peaks value.
```
$ tbutil -s generate_baremetal_file.js -p
```

This example will populate the utilization values with the average of that value, over the [Number of days](#number-of-days).
```
$ tbutil -s generate_baremetal_file.js -a
```

### Number of days
By default, the script will fetch the last 30 days of statistics for utilization data. This can be changed by supplying a different value for the `-d` parameter. You can choose to fetch more days (60, 90, ???), or fewer.

For an offline topology, or where you only want the "in memory" utilization, provide 0 for the number of days.

### Scope
You can scope your request to a single group by fetching it's UUID.

To find the UUID of a group you want to scope to, you can use the native tbutil list functionality.

In this example we use tbutil to find the UUID of the group named VMs_vCenter, then use that UUID to scope our BareMetal file generation.
```
$ tbutil list groups -l | grep VMs_vCenter
abc123                Group           VMs_vCenter                                                   ONPREM  Major     false    VirtualMachine       AND
$ tbutil -s generate_baremetal_file.js -s abc123
```

### Environment
You can use the standard Turbonomic "Environment" types to limit your results as well. The options are;

* ONPREM
* CLOUD
* HYBRID

By default, `HYBRID` or "everything" is used.

In this example we restrict the search to only on-prem VMs, irrespective of target type (vCenter, HyperV, OpenStack, etc).
```
$ tbutil -s generate_baremetal_file.js -e onprem
```

### Limiting results
If you're spot checking, or only want a sample, you can limit the number of results that are returned. By default *all* VMs in scope are returned.

This example restricts the output to only the first five VMs it finds.
```
$ tbutil -s generate_baremetal_file.js -l 5
```

## Output
The script will fetch all VMs for the given parameters, those VMs may be in many different states (active, idle, suspended, etc). A separate output file will be created for each VM state found in the format `hosts-<vm state>.json`.

This is because the actual output does not indicate VM state.

Here is an example output with two VMs.
```
{
  "hosts": [
    {
      "cpuSpeedMhz": "2600",
      "cpuUtilization": "54.79953739398612",
      "diskDataKB": "138.5",
      "diskSizeGB": "18.3876953125",
      "displayName": "VM1",
      "entityId": "1554827044831-421f4028-1f0e-4432-bd2e-d7ec19217431",
      "ipAddresses": [
        "0.0.0.0"
      ],
      "memSizeGB": "16",
      "memUtilization": "7.91260286459039e-11",
      "netTrafficKB": "0",
      "numOfCPU": "4",
      "osName": "CentOS 4/5 or later (64-bit)"
    },
    {
      "cpuSpeedMhz": "1200",
      "cpuUtilization": "0.25",
      "diskDataKB": "0",
      "diskSizeGB": "0",
      "displayName": "VM2",
      "entityId": "1554827045482-aws::ca-central-1::VM::i-02221dd8057fcb1ac",
      "ipAddresses": [
        "0.0.0.0"
      ],
      "memSizeGB": "8",
      "memUtilization": "0",
      "netTrafficKB": "1.48",
      "numOfCPU": "2",
      "osName": "Linux"
    }
  ]
}
```
