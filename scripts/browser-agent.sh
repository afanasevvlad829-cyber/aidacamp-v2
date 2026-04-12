#!/bin/bash
# Browser Agent — remote headless browser automation via SSH
# Usage: ./scripts/browser-agent.sh <command> [args...]
#
# Commands:
#   screenshot <url> [filename] [--full] [--mobile] [--width N] [--height N]
#   scrape <url> [text|html|links|meta]
#   crawl <url> [max_pages] [json|urls]
#   readpage <url> [readable|save]
#   interact <local_script.json>
#   pdf <url> [filename] [--landscape] [--format A4]
#   har <url> [filename] [--summary]
#   lighthouse <url> [--mobile] [--html --output file]
#   diff <image1> <image2> [output]
#   list                          — list saved screenshots
#   fetch <remote_filename>       — download screenshot to local /tmp/

set -euo pipefail

SSH_KEY="$HOME/.ssh/aidacamp_prod"
SSH_HOST="root@159.194.223.55"
AGENT_DIR="/opt/browser-agent"
OUTPUT_DIR="/opt/browser-agent/output"
SSH="ssh -i $SSH_KEY -o ConnectTimeout=10 $SSH_HOST"

cmd="${1:-help}"
shift || true

case "$cmd" in
  screenshot)
    url="${1:?URL required}"
    fname="${2:-screenshot-$(date +%Y%m%d-%H%M%S).png}"
    shift 2 || shift 1 || true
    # Pass remaining flags through
    $SSH "cd $AGENT_DIR && node screenshot.js '$url' '$OUTPUT_DIR/$fname' $*"
    echo "Available at: https://dev.aidacamp.ru/screenshots/$fname"
    ;;

  scrape)
    url="${1:?URL required}"
    mode="${2:-text}"
    $SSH "cd $AGENT_DIR && node scrape.js '$url' '$mode'"
    ;;

  crawl)
    url="${1:?URL required}"
    max="${2:-20}"
    format="${3:-json}"
    $SSH "cd $AGENT_DIR && node crawl.js '$url' '$max' '$format'"
    ;;

  readpage)
    url="${1:?URL required}"
    mode="${2:-readable}"
    $SSH "cd $AGENT_DIR && node readpage.js '$url' '$mode'"
    ;;

  interact)
    script="${1:?Script JSON file required}"
    # Upload script, run, return results
    scp -i "$SSH_KEY" -q "$script" "$SSH_HOST:/tmp/interact-script.json"
    $SSH "cd $AGENT_DIR && node interact.js /tmp/interact-script.json"
    ;;

  list)
    $SSH "ls -lht $OUTPUT_DIR/ 2>/dev/null || echo 'No screenshots yet'"
    ;;

  fetch)
    fname="${1:?Filename required}"
    scp -i "$SSH_KEY" "$SSH_HOST:$OUTPUT_DIR/$fname" "/tmp/$fname"
    echo "Downloaded to /tmp/$fname"
    ;;

  pdf)
    url="${1:?URL required}"
    fname="${2:-page-$(date +%Y%m%d-%H%M%S).pdf}"
    shift 2 || shift 1 || true
    $SSH "cd $AGENT_DIR && node pdf.js '$url' '$OUTPUT_DIR/$fname' $*"
    echo "Available at: https://dev.aidacamp.ru/screenshots/$fname"
    ;;

  har)
    url="${1:?URL required}"
    fname="${2:-trace-$(date +%Y%m%d-%H%M%S).har}"
    shift 2 || shift 1 || true
    $SSH "cd $AGENT_DIR && node har.js '$url' '$OUTPUT_DIR/$fname' $*"
    ;;

  lighthouse)
    url="${1:?URL required}"
    shift 1 || true
    $SSH "cd $AGENT_DIR && node lighthouse.js '$url' $*"
    ;;

  diff)
    img1="${1:?Image 1 required}"
    img2="${2:?Image 2 required}"
    out="${3:-diff-$(date +%Y%m%d-%H%M%S).png}"
    $SSH "cd $AGENT_DIR && node diff.js '$img1' '$img2' '$OUTPUT_DIR/$out'"
    echo "Available at: https://dev.aidacamp.ru/screenshots/$out"
    ;;

  clean)
    $SSH "rm -f $OUTPUT_DIR/*.png $OUTPUT_DIR/*.jpg $OUTPUT_DIR/*.pdf $OUTPUT_DIR/*.har && echo 'Cleaned'"
    ;;

  help|*)
    echo "Browser Agent — remote headless Chromium automation"
    echo ""
    echo "Usage: $0 <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  screenshot <url> [filename] [--full] [--mobile]  Take a screenshot"
    echo "  scrape <url> [text|html|links|meta]              Extract page content"
    echo "  crawl <url> [max_pages] [json|urls]              Crawl site pages"
    echo "  readpage <url> [readable|save]                   Extract article text"
    echo "  interact <script.json>                           Run multi-step script"
    echo "  list                                             List saved screenshots"
    echo "  fetch <filename>                                 Download screenshot"
    echo "  pdf <url> [filename] [--landscape]               Save page as PDF"
    echo "  har <url> [filename] [--summary]                Record HAR network trace"
    echo "  lighthouse <url> [--mobile] [--html --output f] Run Lighthouse audit"
    echo "  diff <img1> <img2> [output]                     Compare two screenshots"
    echo "  clean                                            Remove all output files"
    ;;
esac
