"""Prints the CloudFormation template that the SAM transform produces, so it
can be linted without the .cfnlintrc.yaml exclusions."""
import json
import sys

from samtranslator.translator.transform import transform
from samtranslator.yaml_helper import yaml_parse


class NoManagedPolicies:
    def load(self):
        return {}


with open(sys.argv[1] if len(sys.argv) > 1 else "template.yaml", encoding="utf-8") as f:
    print(json.dumps(transform(yaml_parse(f.read()), {}, NoManagedPolicies()), indent=1))
