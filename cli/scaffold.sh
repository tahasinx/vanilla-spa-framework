#!/usr/bin/env bash

set -e

TYPE="$1"
NAME="$2"

if [ -z "$TYPE" ] || [ -z "$NAME" ]; then
  echo "Usage: ./cli/scaffold.sh [controller|view|request] Name"
  exit 1
fi

case "$TYPE" in
  controller)
    TARGET="controllers/${NAME}.js"
    if [ -f "$TARGET" ]; then
      echo "File already exists: $TARGET"
      exit 1
    fi
    cat > "$TARGET" <<EOF
class ${NAME} extends Controller {
    async index() {
        return '';
    }
}

window.${NAME} = ${NAME};
EOF
    echo "Created $TARGET"
    ;;
  view)
    TARGET="resources/views/${NAME}.html"
    if [ -f "$TARGET" ]; then
      echo "File already exists: $TARGET"
      exit 1
    fi
    cat > "$TARGET" <<EOF
<div>
    <h1>${NAME}</h1>
</div>
EOF
    echo "Created $TARGET"
    ;;
  request)
    mkdir -p requests
    TARGET="requests/${NAME}.js"
    if [ -f "$TARGET" ]; then
      echo "File already exists: $TARGET"
      exit 1
    fi
    cat > "$TARGET" <<EOF
class ${NAME} extends FormRequest {
    rules() {
        return {};
    }

    messages() {
        return {};
    }
}

window.${NAME} = ${NAME};
EOF
    echo "Created $TARGET"
    ;;
  *)
    echo "Unknown type: $TYPE"
    echo "Allowed: controller, view, request"
    exit 1
    ;;
esac
