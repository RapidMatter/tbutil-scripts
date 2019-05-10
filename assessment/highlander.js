/*global args,client,eprintln,exit,getenv,interpolate,print,println,require*/
/*jslint plusplus: true*/

var CloudMigrationHighlanderReport = (function () {
    "use strict";

    CloudMigrationHighlanderReport.prototype.header = [
        "uuid",
        "vm",
        "state",
        "dc",
        "cluster",
        "num_vcpus",
        "vcpu_speed_mhz",
        "vmem_gb",
        "iops_kbps_peak",
        "storage_allocated_mb",
        "allocation_os",
        "allocation_template",
        "allocation_region",
        "allocation_on_demand_hourly",
        "allocation_ri_to_buy",
        "allocation_ri_hourly",
        "consumption_os",
        "consumption_template",
        "consumption_region",
        "consumption_on_demand_hourly",
        "consumption_ri_to_buy",
        "consumption_ri_hourly"
    ];

    CloudMigrationHighlanderReport.prototype.getActionsBody = {
        "actionTypeList": ["MOVE"],
        "relatedEntityTypes": ["VirtualMachine"]
    };

    CloudMigrationHighlanderReport.prototype.stats_req = {
        "statistics": [
            {
                "name": "VMem",
                "relatedEntityType": "VirtualMachine",
                "groupBy": [
                    "key",
                    "relatedEntity",
                    "virtualDisk"
                ],
                "filters": [
                    {
                        "type": "relation",
                        "value": "sold"
                    }
                ]
            },
            {
                "name": "VCPU",
                "relatedEntityType": "VirtualMachine",
                "groupBy": [
                    "key",
                    "relatedEntity",
                    "virtualDisk"
                ],
                "filters": [
                    {
                        "type": "relation",
                        "value": "sold"
                    }
                ]
            },
            {
                "name": "StorageProvisioned",
                "relatedEntityType": "VirtualMachine",
                "groupBy": [
                    "key",
                    "relatedEntity",
                    "virtualDisk"
                ],
                "filters": [
                    {
                        "type": "relation",
                        "value": "bought"
                    }
                ]
            },
            {
                "name": "IOThroughput",
                "relatedEntityType": "VirtualMachine",
                "groupBy": [
                    "key",
                    "relatedEntity",
                    "virtualDisk"
                ],
                "filters": [
                    {
                        "type": "relation",
                        "value": "bought"
                    }
                ]
            },
            {
                "name": "NetThroughput",
                "relatedEntityType": "VirtualMachine",
                "groupBy": [
                    "key",
                    "relatedEntity",
                    "virtualDisk"
                ],
                "filters": [
                    {
                        "type": "relation",
                        "value": "bought"
                    }
                ]
            }
        ]
    };

    /**
     * Initializes a new CloudMigrationHighlanderReport.
     *
     * @constructs CloudMigrationHighlanderReport
     *
     * @param {CloudMigrationPlan} plan - An instantiated CloudMigrationPlan which has been run.
     * @param {object=} options - An optional object having 0 or more of the following options.
     *    <ul>
     *      <li>progressCallback {function} A function with the signature `function (entity, idx, count) {}`. Called each time that a new VM is being processed
     *    </ul>
     */
    function CloudMigrationHighlanderReport(plan, options) {
        this.plan = plan;
        if (options) {
            if (options.hasOwnProperty("progressCallback")) {
                this.progressCallback = options.progressCallback;
            }
        }
    }

    CloudMigrationHighlanderReport.prototype.get_rows = function () {
        if (!this.plan) {
            throw "Plan is not set. Please assign a value to the CloudMigrationHighlanderReport#plan property, or instantiate the object with a plan.";
        }

        this.plan.wait();

        var eIdx = 0,
            egIdx = 0,
            sIdx = 0,
            clusterName,
            dcName,
            os,
            numVCPUs,
            vcpu_speed_mhz,
            vmem_kb,
            io_kbps,
            bought_storage_mb,
            row,
            entity_groups,
            aspects,
            stats,
            result = [],
            vms = this.plan.vms(),
            uuids = Object.keys(vms);

        for (eIdx = 0; eIdx < uuids.length; eIdx++) {
            if (this.progressCallback) {
                this.progressCallback(vms[uuids[eIdx]], eIdx + 1, uuids.length);
            }
            if (vms[uuids[eIdx]].className === "VirtualMachine") {
                clusterName = "N/A";
                dcName = "N/A";
                os = "Unknown";
                vcpu_speed_mhz = 0;
                vmem_kb = 0;
                io_kbps = 0;
                bought_storage_mb = 0;
                row = [];
                entity_groups = client.getGroupsByUuid(vms[uuids[eIdx]].uuid, {"path": true});
                for (egIdx = 0; egIdx < entity_groups.length; egIdx++) {
                    if (entity_groups[egIdx].className === "Cluster") {
                        clusterName = entity_groups[egIdx].displayName;
                    }
                    if (entity_groups[egIdx].className === "DataCenter") {
                        dcName = entity_groups[egIdx].displayName;
                    }
                }
                aspects = client.getAspectsByEntityUuid(vms[uuids[eIdx]].uuid);
                if (aspects.hasOwnProperty("virtualMachineAspect")) {
                    if (aspects.virtualMachineAspect.hasOwnProperty("os")) {
                        os = aspects.virtualMachineAspect.os;
                    }
                    if (aspects.virtualMachineAspect.hasOwnProperty("numVCPUs")) {
                        numVCPUs = aspects.virtualMachineAspect.numVCPUs;
                    }
                }
                stats = client.getStatsByEntityQuery(vms[uuids[eIdx]].uuid, this.stats_req);
                if (stats.length > 0) {
                    for (sIdx = 0; sIdx < stats[0].statistics.length; sIdx++) {
                        if (stats[0].statistics[sIdx].name.toLowerCase() === "vcpu") {
                            vcpu_speed_mhz = stats[0].statistics[sIdx].capacity.total;
                        }
                        if (stats[0].statistics[sIdx].name.toLowerCase() === "vmem") {
                            vmem_kb = stats[0].statistics[sIdx].capacity.total;
                        }
                        if (stats[0].statistics[sIdx].name.toLowerCase() === "iothroughput") {
                            io_kbps = stats[0].statistics[sIdx].values.max;
                        }
                        if (stats[0].statistics[sIdx].name.toLowerCase() === "storageprovisioned") {
                            bought_storage_mb = bought_storage_mb + stats[0].statistics[sIdx].values.total;
                        }
                    }
                }

                if (vms[uuids[eIdx]].allocation_actions.length > 1 || vms[uuids[eIdx]].consumption_actions.length > 1) {
                    println(interpolate("Unexpected more than one action in each alloc or cons. ${vms[uuids[eIdx]].uuid} Alloc Actions: ${vms[uuids[eIdx]].allocation_actions.length} Cons Actions: ${vms[uuids[eIdx]].consumption_actions.length}"));
                }

                row.push(vms[uuids[eIdx]].uuid);
                row.push(vms[uuids[eIdx]].displayName);
                row.push(vms[uuids[eIdx]].state);
                row.push(dcName);
                row.push(clusterName);
                row.push(numVCPUs);
                row.push(vcpu_speed_mhz / numVCPUs);
                row.push(vmem_kb / 1048576);
                row.push(io_kbps);
                row.push(bought_storage_mb);
                row.push(os);
                if (vms[uuids[eIdx]].allocation_actions.length === 1) {
                    row.push(vms[uuids[eIdx]].allocation_actions[0].template.displayName);
                    row.push(vms[uuids[eIdx]].allocation_actions[0].newLocation.displayName);
                    row.push(vms[uuids[eIdx]].allocation_actions[0].target.costPrice);
                    row.push(vms[uuids[eIdx]].allocation_actions[0].ri_to_buy);
                    row.push(vms[uuids[eIdx]].allocation_actions[0].cost_with_ri);
                } else {
                    row.push("");
                    row.push("");
                    row.push("");
                    row.push("");
                    row.push("");
                }
                if (vms[uuids[eIdx]].consumption_actions.length === 1) {
                    row.push(vms[uuids[eIdx]].consumption_actions[0].newEntity.aspects.virtualMachineAspect.os);
                    row.push(vms[uuids[eIdx]].consumption_actions[0].template.displayName);
                    row.push(vms[uuids[eIdx]].consumption_actions[0].newLocation.displayName);
                    row.push(vms[uuids[eIdx]].consumption_actions[0].target.costPrice);
                    row.push(vms[uuids[eIdx]].consumption_actions[0].ri_to_buy);
                    row.push(vms[uuids[eIdx]].consumption_actions[0].cost_with_ri);
                } else {
                    row.push("");
                    row.push("");
                    row.push("");
                    row.push("");
                    row.push("");
                    row.push("");
                }

                result.push(row);
            }
        }
        return result;
    };

    return CloudMigrationHighlanderReport;
}());

function print_usage() {
    "use strict";
    eprintln("");
    eprintln("Usage is ..");
    eprintln("");
    eprintln("  tbscript [{cred}] highlander.js [-h]");
    eprintln("    [-u {plan_uuid} (The uuid of the plan in Turbonomic to produce the report for)]");
    eprintln("    [-f {output_file} (Will be formated according to file extension. I.E. .csv, .txt, .xlsx) Default: highlander.csv]");
    eprintln("");
}

var i = 0,
    plan_uuid,
    output_file = "highlander.csv";

for (i = 0; i < args.length; i++) {
    if (args[i] === "-h") {
        print_usage();
        exit(0);
    }
    if (args[i] === "-u") {
        plan_uuid = args[i + 1];
    }
    if (args[i] === "-f") {
        output_file = args[i + 1];
    }
}

if (!plan_uuid) {
    eprintln("-u {plan_uuid} is required");
    print_usage();
    exit(1);
}

var progressCallback = function (entity, idx, count) {
    "use strict";
    print(interpolate("\rProcessing ${entity.uuid}. Progress: ${idx}/${count}"));
}

var desired_tbuilt_commit_date = Utilities.tbutil_date_string_to_date_obj("2019-03-06 16:15:45 +0000");
var tbutil_commit_date = Utilities.tbutil_date_string_to_date_obj(getenv("TURBO_COMMIT_DATE"));

if (tbutil_commit_date < desired_tbuilt_commit_date) {
    eprintln("Expected tbutil 1.1i or newer. Currently installed " + getenv("TURBO_BRANCH") + ". Please upgrade to use this script");
    exit(1);
}

var non_byol_plan = new CloudMigrationPlan({}, {}, "foo", {});
non_byol_plan.scenario_run_response.uuid = plan_uuid;

var highlander = new CloudMigrationHighlanderReport(non_byol_plan, {"progressCallback": progressCallback});
rows = highlander.get_rows();
println("Finished!")

printTable(highlander.header, rows);
writeTable(output_file, highlander.header, rows);
