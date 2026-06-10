# unit-converter (`process-eng-unit-converter`)

A standalone **Python** unit-conversion library for process-engineering calculations. It parses
unit expressions from strings (with SI prefixes and compound units like `daN*mm^2`) and converts
between them using exact `Decimal` arithmetic.

> ⚠️ **This is NOT a frontend / npm package.** Despite living under `packages/`, it has no
> `package.json` and is **not** a Bun workspace member. Do not try to `import` it from any
> TypeScript app. For frontend unit conversion use
> [`@eng-suite/physics`](../physics-engine/src/unitConversion.ts) (`convertUnit`) or
> [`@eng-suite/engineering-units`](../engineering-units) instead.

## Status: currently unused — kept for future backend use

As of this writing **nothing imports this package.** It is retained intentionally in case a
future Python service needs string-based unit parsing. The process-design-agents sub-project
ships its *own* copy at
`services/api/app/services/process_design_agents/utils/unit_converter/` — that embedded copy is
the one actually imported today. Do not add a third copy; if a backend service needs this, depend
on this package rather than copying it again.

## Layout

```
packages/unit-converter/
├── pyproject.toml          # setuptools build config; package name: process-eng-unit-converter
├── README.md               # this file
└── unit_converter/         # the importable package (`unit_converter`)
    ├── __init__.py         # re-exports convert / converts
    ├── converter.py        # convert(quantity, unit) -> Decimal ; converts(...) -> str
    ├── parser.py           # QuantityParser / UnitParser
    ├── units.py            # Unit definitions
    ├── data.py             # UNITS + PREFIXES tables
    ├── exceptions.py
    └── tests/              # pytest suite (test_data, test_functional, test_parser, test_units)
```

## Usage (if a backend needs it)

Install it editable into the consuming service's virtual environment:

```bash
cd packages/unit-converter
pip install -e .
```

Then:

```python
from unit_converter import convert, converts          # convenience re-exports
# or, equivalently:
from unit_converter.converter import convert, converts

convert('2.78 daN*mm^2', 'mN*µm^2')   # -> Decimal('2.78E+10')
converts('15 psi', 'kPa')             # -> str
```

`convert()` returns a `Decimal`; `converts()` returns the same value as a `str`. Both raise on
unparseable units (see `unit_converter/exceptions.py`).

## Tests

```bash
cd packages/unit-converter
python -m pytest unit_converter/tests
```
