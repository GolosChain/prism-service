#/bin/bash
set -euo pipefail

IMAGETAG="dev-${BUILDKITE_BRANCH}-${BUILDKITE_BUILD_NUMBER}"

ansible-vault view playbooks/configs/.npmrc.vault --vault-password-file ~/vault_pass > .npmrc
docker build -t commun/prism-service:${IMAGETAG} .
rm .npmrc

docker login -u=$DHUBU -p=$DHUBP
docker push commun/prism-service:${IMAGETAG}
