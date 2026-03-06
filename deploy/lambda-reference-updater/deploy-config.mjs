/**
 * MedCloud Reference Code Updater — AWS Deployment Config
 * ─────────────────────────────────────────────────────────────────────────────
 * Deploy this Lambda separately from the main medcloud-api Lambda.
 * It runs on a schedule, not per-request, so it doesn't need API Gateway.
 *
 * SCHEDULE:
 *   - Every quarter (Jan 1, Apr 1, Jul 1, Oct 1 at 06:00 UTC)
 *     → Updates: CARC, RARC, HCPCS, NCCI PTP/MUE
 *   - Oct 1 only:
 *     → Also updates: ICD-10-CM, ICD-10-PCS, MS-DRG (annual fiscal year releases)
 *   - Manual trigger any time via API: POST /admin/reference-codes/update
 *
 * DEPLOY COMMANDS (run from /deploy/lambda-reference-updater/):
 *   npm install
 *   zip -r reference-updater.zip index.mjs package.json node_modules/
 *   aws lambda update-function-code \
 *     --function-name medcloud-reference-updater \
 *     --zip-file fileb://reference-updater.zip \
 *     --region us-east-1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const deployConfig = {
  // Lambda function config
  lambda: {
    functionName: 'medcloud-reference-updater',
    runtime: 'nodejs20.x',
    handler: 'index.handler',
    timeout: 900,          // 15 min max — NCCI files can be large
    memorySize: 512,
    description: 'Auto-updates CARC/RARC/ICD-10/HCPCS/NCCI reference codes from official CMS and X12 sources',
    environment: {
      // Same DB connection as main Lambda
      DB_HOST: '${ssm:/medcloud/db/host}',
      DB_PORT: '5432',
      DB_NAME: 'medcloud',
      DB_USER: '${ssm:/medcloud/db/user}',
      DB_PASSWORD: '${ssm:/medcloud/db/password}',
      SNS_TOPIC_ARN: '${ssm:/medcloud/sns/ops-topic}',  // Optional: notify team of updates
    },
    // VPC config — same as main Lambda to reach Aurora
    vpcConfig: {
      subnetIds: ['${ssm:/medcloud/vpc/subnet-1}', '${ssm:/medcloud/vpc/subnet-2}'],
      securityGroupIds: ['${ssm:/medcloud/vpc/lambda-sg}'],
    },
  },

  // EventBridge Scheduler rules
  schedules: [
    {
      name: 'medcloud-ref-codes-quarterly',
      // Every quarter: Jan 1, Apr 1, Jul 1, Oct 1 at 06:00 UTC
      schedule: 'cron(0 6 1 1,4,7,10 ? *)',
      description: 'Quarterly reference code update — CARC, RARC, HCPCS, NCCI',
      input: { update_type: null }, // null = update all available for this quarter
    },
    {
      name: 'medcloud-ref-codes-annual-icd',
      // Oct 1 only at 07:00 UTC (after quarterly runs) — ICD-10 annual update
      schedule: 'cron(0 7 1 10 ? *)',
      description: 'Annual ICD-10-CM/PCS and MS-DRG update (Oct 1 fiscal year release)',
      input: { update_type: 'icd10_cm', force: true },
    },
  ],

  // IAM permissions this Lambda needs
  iamPermissions: [
    'ssm:GetParameter',          // Read DB credentials
    'sns:Publish',               // Send update notifications
    'logs:CreateLogGroup',
    'logs:CreateLogStreams',
    'logs:PutLogEvents',
    'ec2:CreateNetworkInterface',
    'ec2:DescribeNetworkInterfaces',
    'ec2:DeleteNetworkInterface', // VPC access for Aurora
    'xray:PutTraceSegments',     // X-Ray tracing
  ],
};

/*
 * CloudFormation snippet (add to your existing cfn template):
 *
 * ReferenceUpdaterLambda:
 *   Type: AWS::Lambda::Function
 *   Properties:
 *     FunctionName: medcloud-reference-updater
 *     Runtime: nodejs20.x
 *     Handler: index.handler
 *     Timeout: 900
 *     MemorySize: 512
 *     Code:
 *       S3Bucket: !Ref DeploymentBucket
 *       S3Key: reference-updater.zip
 *
 * QuarterlyUpdateRule:
 *   Type: AWS::Events::Rule
 *   Properties:
 *     Name: medcloud-ref-codes-quarterly
 *     ScheduleExpression: cron(0 6 1 1,4,7,10 ? *)
 *     State: ENABLED
 *     Targets:
 *       - Id: ReferenceUpdaterLambda
 *         Arn: !GetAtt ReferenceUpdaterLambda.Arn
 *         Input: '{"update_type": null}'
 *
 * AnnualICD10Rule:
 *   Type: AWS::Events::Rule
 *   Properties:
 *     Name: medcloud-ref-codes-annual-icd
 *     ScheduleExpression: cron(0 7 1 10 ? *)
 *     State: ENABLED
 *     Targets:
 *       - Id: ReferenceUpdaterLambda
 *         Arn: !GetAtt ReferenceUpdaterLambda.Arn
 *         Input: '{"update_type": "icd10_cm", "force": true}'
 */
