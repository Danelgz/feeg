content = open('public/frontrear.html').read()
with open('public/frontrear_split.html', 'w') as f:
    f.write(content.replace('>', '>\n'))
