# AWS Account Summary
This tbutil script will iterate over all AWS accounts available in the Turbonomic instance, and produce a report [output](#output) with useful detail. This includes both accounts discovered through the [consolidated billing report](#consolidated-billing-report), and those added specifically as [targets](https://greencircle.vmturbo.com/docs/DOC-3828-connecting-turbonomic-to-amazon-web-services-aws).

## Usage
There are no CLI options for this script, it simply iterates over all accounts and produces an [output](#output) as `result.xlsx`

### Optimization Plans
For each AWS account added as a target, the script will run an optimization plan, scoped to that account. The results of this will be presented in the final [output](#output)

All plans will be in the form `DELETE-ME Cloud Optimize <AWS Account ID>`

## Output
The output will be an excel spreadsheet, named `result.xlsx`. The same output is also presented in an ASCII table on standard output (STDOUT).

The columns of the output are as follows

Column Name | Description
------------|------------
aws_account_id | The AWS Account ID
turbo_has_billing_report | A boolean. True if the consolidated billing report has been configured, and this account ID is included in the report. False otherwise
turbo_has_target | A boolean. True if the account has been added to Turbonomic as a target. False otherwise
vms_total | Total number of VMs discovered in the account. <sup>1</sup>
vms_active| Total number of VMs which are active in the account. <sup>1</sup>
ec2_hourly | Per-Hour cost of ec2 services <sup>2,3</sup>
non_ec2_hourly | Per-Hour cost of non ec2 services <sup>2,3</sup>
ec2_monthly | ec2_hourly * 730
non_ec2_monthly | non_ec2_hourly * 730
optimize_plan_ec2_hourly_before | Per-Hour cost of ec2 resources before Turbonomic Optimization <sup>1,4</sup>
optimize_plan_ec2_hourly_after | Per-Hour cost of ec2 resources after Turbonomic Optimization <sup>1,4</sup>
optimize_plan_ec2_monthly_before | optimize_plan_ec2_hourly_before * 730
optimize_plan_ec2_monthly_after | optimize_plan_ec2_hourly_after * 730

Footnotes:
1. Only available when `turbo_has_target` is true
2. See details in [Consolidated Billing Report](#consolidated-billing-report) below
3. Only available when `turbo_has_billing_report` is true
4. The costs for the optimization plan are estimated based on the ec2 resources which are queried (VMs, storage volumes, RDS instances), using rack rate costs, and assuming that the resources run 730 hours per month

## Data Sources
The script pulls data from the API using various different API calls.

### Consolidated Billing Report
Several details are collected from the API which use the consolidated billing report. The consolidated billing report is initially configured to be generated and stored in an S3 bucket on a daily basis. Turbonomic is then configured to fetch those reports and use that data for reporting purposes.

Documentation on configuring the consolidated billing report can be found on our [Green Circle forums](https://greencircle.vmturbo.com/docs/DOC-4613).

The API call used in this script to fetch data from the consolidated billing details stored in Turbonomics for each AWS account is as follows;

POST Request:
`curl -X POST "https://<turbonomic hostname or ip>/vmturbo/rest/stats/<uuid of aws account>" -H "accept: application/json" -H "Content-Type: application/json"`

POST Body:
```
{
  "statistics": [
    {
      "name": "costPrice",
      "groupBy": [
        "cloudService"
      ],
      "relatedEntityType": "CloudService"
    }
  ]
}
```

In the [output](#output) this is broken down into two categories.

1. "EC2 Services" - This is anything in the API response where the `costPrice` filter value includes "EC2".
2. "Non EC2 Services" - This is anything in the API response where the `costPrice` filter value does *not* include "EC2"

### Cloud Optimize Plan results
Detail about costs for ec2 services before and after Turbonomic cloud optimization is fetched from an optimization plan, via the API.

Estimated cost data for RDS, EC2 and EBS are fetched using the following API call;

POST Request:
`curl -X POST "https://<turbonomic hostname or ip>/vmturbo/rest/stats/<uuid of aws account>" -H "accept: application/json" -H "Content-Type: application/json"`

POST Body:
```
{
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
  "endDate": "<now unix timestamp>"
}
```

Cost data for Reserved Instances (RIs) is fetched using the following API call;

POST Request:
`curl -X POST "https://se1.demo.turbonomic.com/vmturbo/rest/reservedinstances/stats?ascending=true" -H "accept: application/json" -H "Content-Type: application/json"`

POST Body:
```
{
  "scopes": [
    "plan.uuid"
  ],
  "period": {
    "statistics": [
      {
        "name": "RICost"
      }
    ],
    "endDate": "<now unix timestamp>"
  }
}
```
