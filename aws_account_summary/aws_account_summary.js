/*global require*/
var plan = require('./lib/plans.js');

function roundToHundrethsDecimal(number) {
    "use strict";
    return Math.round(number * 100) / 100;
}

// https://se2.demo.turbonomic.com/vmturbo/rest/stats/Market?disable_hateoas=true
var stat_payload_0 = {"statistics":[{"name":"costPrice","groupBy":["cloudService"],"relatedEntityType":"CloudService"}]} // Cost Breakdown by Cloud Service request 1
var stat_payload_1 = {"statistics":[{"name":"costPrice","groupBy":["cloudService"],"relatedEntityType":"CloudService"}],"startDate":1552860000000,"endDate":1552953511522} // Cost Breakdown by Cloud Service request 2 (beginning of yesterday until now0)
var stat_payload_2 = {"statistics":[{"name":"costPrice","groupBy":["cloudService", "CSP"]}]}
var stat_payload_3 = {"statistics":[{"filters":[{"type":"CSP","value":"AWS"}],"groupBy":["cloudService"],"name":"costPrice","relatedEntityType":"CloudService"}]}


var est_stat_payload_0 = {
  "statistics": [
    {
      "filters": [
        {
          "type": "costComponent",
          "value": "COMPUTE"
        },
        {
          "type": "costComponentArtifact",
          "value": "ON_DEMAND_COMPUTE_LICENSE_COST"
        }
      ],
      "name": "costPrice",
      "relatedEntityType": "VirtualMachine"
    },
    {
      "filters": [
        {
          "type": "costComponent",
          "value": "COMPUTE"
        },
        {
          "type": "costComponentArtifact",
          "value": "ON_DEMAND_COMPUTE_LICENSE_COST"
        }
      ],
      "name": "costPrice",
      "relatedEntityType": "Database"
    },
    {
      "filters": [
        {
          "type": "costComponent",
          "value": "COMPUTE"
        },
        {
          "type": "costComponentArtifact",
          "value": "ON_DEMAND_COMPUTE_LICENSE_COST"
        }
      ],
      "name": "costPrice",
      "relatedEntityType": "DatabaseServer"
    },
    {
      "name": "costPrice",
      "relatedEntityType": "Storage"
    },
    {
      "name": "numWorkloads",
      "filters": [
        {
          "type": "environmentType",
          "value": "CLOUD"
        }
      ]
    }
  ],
  "endDate": Date.now()
}

// https://se1.demo.turbonomic.com/vmturbo/rest/stats/2541254590336?disable_hateoas=true
var plan_compute_and_storage_stats_request = {
  "statistics": [
    {
      "filters": [
        {
          "type": "costComponent",
          "value": "COMPUTE"
        },
        {
          "type": "costComponentArtifact",
          "value": "ON_DEMAND_COMPUTE_LICENSE_COST"
        }
      ],
      "name": "costPrice",
      "relatedEntityType": "VirtualMachine"
    },
    {
      "filters": [
        {
          "type": "costComponent",
          "value": "COMPUTE"
        },
        {
          "type": "costComponentArtifact",
          "value": "ON_DEMAND_COMPUTE_LICENSE_COST"
        }
      ],
      "name": "costPrice",
      "relatedEntityType": "Database"
    },
    {
      "filters": [
        {
          "type": "costComponent",
          "value": "COMPUTE"
        },
        {
          "type": "costComponentArtifact",
          "value": "ON_DEMAND_COMPUTE_LICENSE_COST"
        }
      ],
      "name": "costPrice",
      "relatedEntityType": "DatabaseServer"
    },
    {
      "name": "costPrice",
      "relatedEntityType": "Storage"
    },
    {
      "name": "numWorkloads",
      "filters": [
        {
          "type": "environmentType",
          "value": "CLOUD"
        }
      ]
    }
  ],
  "endDate": "1554854226434"
}

// https://se1.demo.turbonomic.com/vmturbo/rest/reservedinstances/stats?disable_hateoas=true
var plan_ri_stats_request = {"scopes":["plan.uuid"],"period":{"statistics":[{"name":"RICost"}],"endDate":Date.now()}}

var aws_accounts = client.getSearchResults({types: ["BusinessAccount"]});

var headers = ["aws_account_id", "turbo_has_billing_report", "turbo_has_target", "vms_total", "vms_active", "ec2_hourly", "non_ec2_hourly", "ec2_monthly", "non_ec2_monthly", "optimize_plan_ec2_hourly_before", "optimize_plan_ec2_hourly_after", "optimize_plan_ec2_monthly_before", "optimize_plan_ec2_monthly_after"];
var rows = [];

var ec2_hourly_cost = 0,
    aws_non_ec2_hourly_cost = 0,
    just_total = 0,
    minutes_per_month = 43800, // 730hr
    has_billing_report = false,
    has_target = false,
    vms_active = 0,
    opt_plan,
    schain,
    aws_cost_stats,
    i,
    f,
    opt_ec2_hourly_cost_before = 0,
    opt_ec2_hourly_cost_after = 0,
    vms_total = 0,
    opt_ri_costs = 0,
    opt_ec2_costs = 0;

for (var aidx=0; aidx < aws_accounts.length; aidx++) {
  println(`Operating on account ${aws_accounts[aidx].displayName}`);
  if (aws_accounts[aidx].cloudType !== "AWS") {
    continue;
  }
  schain = client.getSupplyChainByMarketUuid( aws_accounts[aidx].uuid, {types: ["VirtualMachine"]} )
  aws_cost_stats = client.getStatsByUuidQuery( aws_accounts[aidx].uuid, stat_payload_0 );
  ec2_hourly_cost = 0;
  aws_non_ec2_hourly_cost = 0;
  just_total = 0;
  has_billing_report = false;
  has_target = false;
  vms_active = 0;
  opt_ec2_hourly_cost_before = 0;
  opt_ec2_hourly_cost_after = 0;
  vms_total = 0;

  if (schain.hasOwnProperty("seMap") &&
      schain.seMap.hasOwnProperty("VirtualMachine") &&
      schain.seMap.VirtualMachine.hasOwnProperty("stateSummary") &&
      schain.seMap.VirtualMachine.stateSummary.hasOwnProperty("ACTIVE")) {
        // TODO: I'm not sure that this is a safe assumption. It may not have any active VMs, but still be added as a target?
        opt_plan = new plan.CloudOptimizePlan(aws_accounts[aidx], interpolate("DELETE-ME Cloud Optimize ${aws_accounts[aidx].displayName}"));
        opt_plan.run();
        opt_plan.wait();
        vms_active = schain.seMap.VirtualMachine.stateSummary.ACTIVE;

        plan_ri_stats_request.scopes = [opt_plan.scenario_run_response.uuid];
        plan_ri_stats_request.endDate = Date.now();
        est_stat_payload_0.endDate = Date.now();

        opt_ri_costs = client.getRIStatsQuery( {}, plan_ri_stats_request );
        opt_ec2_costs = client.getStatsByUuidQuery(opt_plan.scenario_run_response.uuid, est_stat_payload_0);


        if (opt_ri_costs.length > 0 &&
            opt_ri_costs[0].hasOwnProperty("stats") &&
            opt_ri_costs[0].stats.length > 0 &&
            opt_ri_costs[0].stats[0].hasOwnProperty("statistics") &&
            opt_ri_costs[0].stats[0].statistics.length > 0 &&
            opt_ri_costs[0].stats[0].statistics[0].hasOwnProperty("capacity") &&
            opt_ri_costs[0].stats[0].statistics[0].capacity.hasOwnProperty("total")
          ) {
              opt_ec2_hourly_cost_before = opt_ri_costs[0].stats[0].statistics[0].capacity.total;
            } else {
              opt_ec2_hourly_cost_before = 0;
        }
        for (var i=0; i < opt_ec2_costs[0].statistics.length; i++) {
          if (opt_ec2_costs[0].statistics[i].name === "costPrice") {
              opt_ec2_hourly_cost_before = opt_ec2_hourly_cost_before + opt_ec2_costs[0].statistics[i].values.total;
          }
        }


        if (opt_ri_costs.length > 0 &&
            opt_ri_costs[0].hasOwnProperty("stats") &&
            opt_ri_costs[0].stats.length > 1 &&
            opt_ri_costs[0].stats[1].hasOwnProperty("statistics") &&
            opt_ri_costs[0].stats[1].statistics.length > 0 &&
            opt_ri_costs[0].stats[1].statistics[0].hasOwnProperty("capacity") &&
            opt_ri_costs[0].stats[1].statistics[0].capacity.hasOwnProperty("total")
          ) {
          opt_ec2_hourly_cost_after = opt_ri_costs[0].stats[1].statistics[0].capacity.total;
        } else {
          opt_ec2_hourly_cost_after = 0;
        }
        for (var i=0; i < opt_ec2_costs[1].statistics.length; i++) {
          if (opt_ec2_costs[1].statistics[i].name === "costPrice") {
              opt_ec2_hourly_cost_after = opt_ec2_hourly_cost_after + opt_ec2_costs[1].statistics[i].values.total;
          }

          if (opt_ec2_costs[1].statistics[i].name === "numWorkloads") {
              vms_total = opt_ec2_costs[1].statistics[i].values.total;
          }
        }
        has_target = true;
  } else {
    eprintln("Account is not connected as a target");
  }

  if (aws_cost_stats.length === 0) {
    eprintln("Billing report data is not available");
    aws_cost_stats = client.getStatsByUuidQuery(aws_accounts[aidx].uuid, est_stat_payload_0);
  } else {
    has_billing_report = true;
  }

  for (i=0; i < aws_cost_stats[0].statistics.length; i++) {
    if (aws_cost_stats[0].statistics[i].name === "costPrice") {
      if (aws_cost_stats[0].statistics[i].hasOwnProperty("filters")) {
        for (f=0; f < aws_cost_stats[0].statistics[i].filters.length; f++){
          if(aws_cost_stats[0].statistics[i].filters[f].value.toLowerCase().includes("ec2")) {
            ec2_hourly_cost = aws_cost_stats[0].statistics[i].values.total;
          } else {
            aws_non_ec2_hourly_cost = aws_non_ec2_hourly_cost + aws_cost_stats[0].statistics[i].values.total;
          }
        }
      }
      just_total = just_total + aws_cost_stats[0].statistics[i].values.total;
    }
  }

  rows.push([aws_accounts[aidx].displayName, has_billing_report, has_target, vms_total, vms_active, ec2_hourly_cost, aws_non_ec2_hourly_cost, minutes_per_month/60*ec2_hourly_cost, minutes_per_month/60*aws_non_ec2_hourly_cost, opt_ec2_hourly_cost_before, opt_ec2_hourly_cost_after, minutes_per_month/60*opt_ec2_hourly_cost_before, minutes_per_month/60*opt_ec2_hourly_cost_after])
}

printTable(headers, rows);
writeTable("results.xlsx", headers, rows);
