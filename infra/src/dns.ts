import * as awsNative from "@pulumi/aws-native";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { nm } from "./helpers";

const cfg = new pulumi.Config();

// Existing Hosted Zone
export const zone = new awsNative.route53.HostedZone(nm("zone"), {
  name: cfg.require("deployDomain"),
});

// Create a wildcard certificate
const wildcardCert = new aws.acm.Certificate(nm("wildcardCert"), {
  domainName: `*.${cfg.require("deployDomain")}`,
  validationMethod: "DNS",
});

// DNS Validation
const validationOption = wildcardCert.domainValidationOptions[0];

const dnsRecord = new aws.route53.Record(nm("validationRecord"), {
  zoneId: zone.id,
  name: validationOption.resourceRecordName,
  type: validationOption.resourceRecordType,
  records: [validationOption.resourceRecordValue],
  ttl: 300,
});

// To ensure the certificate is validated before it's used
const validatedWildcardCert = new aws.acm.CertificateValidation(
  nm("certValidation"),
  {
    certificateArn: wildcardCert.arn,
    validationRecordFqdns: [dnsRecord.fqdn],
  },
  { dependsOn: [dnsRecord] },
);

export const certificateArn = validatedWildcardCert.certificateArn;
// export const certificateArn = wildcardCert.arn;
