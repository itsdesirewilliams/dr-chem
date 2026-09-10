import pathlib

p = pathlib.Path('components/product/ProductSections.tsx')
l = p.read_text(encoding='utf-8').splitlines()

# Fix line 260 (0-based 259): correct indentation for the dl tag
l[259] = '          <dl className="divide-y divide-ink-200">'

p.write_text('\n'.join(l) + '\n', encoding='utf-8')
print('Fixed. Line 260:', repr(l[259]))
