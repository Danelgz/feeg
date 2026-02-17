content = open('public/cuerpo.html').read()
with open('public/cuerpo_split.html', 'w') as f:
    f.write(content.replace('>', '>\n'))
