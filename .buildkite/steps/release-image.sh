#/bin/bash
set -euo pipefail

IMAGETAG="dev-${BUILDKITE_BRANCH}-${BUILDKITE_BUILD_NUMBER}"

if [[ "${BUILDKITE_TAG}" != "" ]]; then
    docker login -u=$DHUBU -p=$DHUBP
    docker pull commun/prism-service:${IMAGETAG}
    docker tag commun/prism-service:${IMAGETAG} commun/prism-service:${BUILDKITE_TAG}
    docker push commun/prism-service:${BUILDKITE_TAG}
fi
