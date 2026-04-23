#!/usr/bin/env bash

set -e

COMMAND="$1"
NAME="$2"
EXTRA="$3"

print_help() {
  cat <<'EOF'
Vanilla SPA CLI

Usage:
  ./cli/scaffold.sh <command> [name] [args]

Scaffolding:
  make:controller <Name>         Create controllers/<Name>.js
  make:view <name>               Create resources/views/<name>.html
  make:request <Name>            Create requests/<Name>.js
  make:component <Name>          Create components/<Name>.js
  make:provider <Name>           Create providers/<Name>.js
  make:middleware <Name>         Create middleware/<Name>.js
  make:lang <locale> [group]     Create resources/lang/<locale>/<group>.json
  make:test <name>               Create tests/<name>.test.js

Utility:
  route:list                     Print AppRouter route definitions
  lang:list                      List locales under resources/lang
  cache:clear                    Print cache clear instructions
  test                           Open tests/run-tests.html path hint
  serve [port]                   Start python server (default 5500)
  list                           Show this help

Backward-compatible aliases:
  controller|view|request|component|provider|middleware
EOF
}

ensure_name() {
  if [ -z "$NAME" ]; then
    echo "Missing required name argument."
    print_help
    exit 1
  fi
}

create_file_or_fail() {
  local target="$1"
  if [ -f "$target" ]; then
    echo "File already exists: $target"
    exit 1
  fi
}

# Backward-compatible aliases
case "$COMMAND" in
  controller) COMMAND="make:controller" ;;
  view) COMMAND="make:view" ;;
  request) COMMAND="make:request" ;;
  component) COMMAND="make:component" ;;
  provider) COMMAND="make:provider" ;;
  middleware) COMMAND="make:middleware" ;;
  ""|help|--help|-h|list) COMMAND="list" ;;
esac

case "$COMMAND" in
  make:controller)
    ensure_name
    TARGET="controllers/${NAME}.js"
    create_file_or_fail "$TARGET"
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

  make:view)
    ensure_name
    TARGET="resources/views/${NAME}.html"
    create_file_or_fail "$TARGET"
    cat > "$TARGET" <<EOF
<div>
    <h1>${NAME}</h1>
</div>
EOF
    echo "Created $TARGET"
    ;;

  make:request)
    ensure_name
    mkdir -p requests
    TARGET="requests/${NAME}.js"
    create_file_or_fail "$TARGET"
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

  make:component)
    ensure_name
    mkdir -p components
    TARGET="components/${NAME}.js"
    create_file_or_fail "$TARGET"
    cat > "$TARGET" <<EOF
window.View.component('${NAME}', (props) => {
    const title = props.title || '${NAME}';
    const content = props.slot || '';
    return \`
<section class="component-${NAME}">
    <h3>\${title}</h3>
    <div>\${content}</div>
</section>
\`;
});
EOF
    echo "Created $TARGET"
    ;;

  make:provider)
    ensure_name
    mkdir -p providers
    TARGET="providers/${NAME}.js"
    create_file_or_fail "$TARGET"
    cat > "$TARGET" <<EOF
class ${NAME} extends ServiceProvider {
    register() {
        // Register bindings:
        // window.Container.singleton('serviceName', () => ({}));
    }

    boot() {
        // Boot logic
    }
}

window.${NAME} = ${NAME};
EOF
    echo "Created $TARGET"
    ;;

  make:middleware)
    ensure_name
    mkdir -p middleware
    TARGET="middleware/${NAME}.js"
    create_file_or_fail "$TARGET"
    cat > "$TARGET" <<EOF
window.AppRouter.middleware('${NAME}', (context) => {
    // Return true to continue, false to block, or '/path' to redirect.
    return true;
});
EOF
    echo "Created $TARGET"
    ;;

  make:lang)
    ensure_name
    GROUP="${EXTRA:-messages}"
    mkdir -p "resources/lang/${NAME}"
    TARGET="resources/lang/${NAME}/${GROUP}.json"
    create_file_or_fail "$TARGET"
    cat > "$TARGET" <<EOF
{
  "welcome": "Welcome, :name",
  "items": "1 item|:count items"
}
EOF
    echo "Created $TARGET"
    ;;

  make:test)
    ensure_name
    mkdir -p tests
    TARGET="tests/${NAME}.test.js"
    create_file_or_fail "$TARGET"
    cat > "$TARGET" <<EOF
(() => {
    test('${NAME}', () => {
        expect(true).toBeTrue();
    });
})();
EOF
    echo "Created $TARGET"
    ;;

  route:list)
    if [ ! -f "routes/web.js" ]; then
      echo "routes/web.js not found."
      exit 1
    fi
    echo "Registered routes (from routes/web.js):"
    awk '
      {
        line = $0
        sub(/^[[:space:]]+/, "", line)
      }
      line ~ /^\/\// { next }
      line ~ /AppRouter\.(get|post|put|delete)\(/ { print NR ":" $0 }
    ' routes/web.js
    ;;

  lang:list)
    if [ ! -d "resources/lang" ]; then
      echo "resources/lang directory not found."
      exit 1
    fi
    echo "Locales:"
    ls -1 resources/lang
    ;;

  cache:clear)
    echo "Runtime cache can be cleared in browser context with:"
    echo "  window.View.clearRenderCache();"
    echo "  window.Api.stopAllLive();"
    ;;

  test)
    echo "Open this in browser to run tests:"
    echo "  tests/run-tests.html"
    ;;

  serve)
    PORT="${NAME:-5500}"
    echo "Starting server on http://127.0.0.1:${PORT}"
    python -m http.server "$PORT" --bind 127.0.0.1
    ;;

  list)
    print_help
    ;;

  *)
    echo "Unknown command: $COMMAND"
    print_help
    exit 1
    ;;
esac
