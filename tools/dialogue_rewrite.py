"""Explicit offline dialogue editing through the project's Leihuo gateway.

Credentials stay server-side. Only the selected editorial brief is submitted;
responses are review candidates and never change game rules or source files.
"""
import argparse
import json
import os
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def settings():
    cfg = {}
    path = ROOT / '.env'
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                cfg[key.strip()] = value.strip().strip('"').strip("'")
    base = os.environ.get('LLM_BASE_URL') or cfg.get('LLM_BASE_URL', 'https://ai.leihuo.netease.com')
    if urllib.parse.urlparse(base).hostname != 'ai.leihuo.netease.com':
        raise ValueError('Configured host is not the requested Leihuo gateway')
    key = os.environ.get('LLM_API_KEY') or cfg.get('LLM_API_KEY')
    if not key:
        raise ValueError('Gateway credential unavailable')
    return base.rstrip('/'), key


def request(path, payload=None):
    base, key = settings()
    data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode('utf-8')
    headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'}
    if path.endswith('/messages'):
        headers['anthropic-version']='2023-06-01'
    req = urllib.request.Request(base + path, data=data,headers=headers)
    with urllib.request.urlopen(req, timeout=100) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['models', 'draft'])
    parser.add_argument('--input', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--model')
    parser.add_argument('--max-tokens', type=int, default=12000)
    args = parser.parse_args()
    if args.mode == 'models':
        data = request('/v1/models')
        result = {'models': [row['id'] for row in data.get('data', []) if isinstance(row, dict) and 'id' in row]}
        summary = {'models': result['models']}
    else:
        if not args.model or not args.input:
            parser.error('draft requires --model and --input')
        brief = json.loads(args.input.read_text(encoding='utf-8'))
        payload = {'model': args.model, 'max_tokens': args.max_tokens, 'temperature': .65,
                   'messages': [{'role': 'system', 'content': brief['instruction']},
                                {'role': 'user', 'content': json.dumps(brief['material'], ensure_ascii=False)}]}
        anthropic=args.model.lower().startswith('claude-')
        if anthropic:
            payload['system']=brief['instruction']
            payload['messages']=payload['messages'][1:]
        endpoint='/v1/messages' if anthropic else '/v1/chat/completions'
        data = request(endpoint, payload)
        message = ''.join(block.get('text','') for block in data['content'] if block.get('type')=='text') if anthropic else data['choices'][0]['message']['content']
        result = {'requested_model': args.model, 'returned_model': data.get('model'),
                  'endpoint':endpoint,'parameters': {'max_tokens': args.max_tokens, 'temperature': .65},
                  'brief': brief, 'content': message, 'usage': data.get('usage'),
                  'finish_reason': data.get('stop_reason') if anthropic else data['choices'][0].get('finish_reason'),
                  'review': 'Candidate only; requires local factual and editorial review before implementation.'}
        summary = {key: result[key] for key in ['requested_model', 'returned_model', 'usage', 'finish_reason']}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({**summary, 'output': str(args.output)}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except urllib.error.HTTPError as exc:
        detail=exc.read(4096).decode('utf-8',errors='replace')
        try:
            _,key=settings()
            detail=detail.replace(key,'[redacted]')
        except Exception:
            detail='Unable to redact response; body omitted'
        print(json.dumps({'error': 'gateway_http', 'status': exc.code, 'detail':detail[:1800]},ensure_ascii=False))
        raise SystemExit(1)
    except Exception as exc:
        print(json.dumps({'error': type(exc).__name__}))
        raise SystemExit(1)
