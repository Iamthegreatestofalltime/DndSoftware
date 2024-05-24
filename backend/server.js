const express = require('express');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
const cors = require('cors');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const { exec } = require('child_process');
const cheerio = require('cheerio');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');
const templatesDir = path.join(__dirname, 'templates');
const stylesPath = path.join(uploadsDir, 'styles.css'); // Path to styles.css

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Ensure index.js and template.html are always present
const indexPath = path.join(uploadsDir, 'index.js');
const templatePath = path.join(uploadsDir, 'template.html');
if (!fs.existsSync(indexPath)) {
  fs.copyFileSync(path.join(templatesDir, 'index.js'), indexPath);
}
if (!fs.existsSync(templatePath)) {
  fs.copyFileSync(path.join(templatesDir, 'template.html'), templatePath);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.use('/dist', express.static(path.join(__dirname, 'dist')));

const files = {}; // Declare the files object

const extractDependencies = (code) => {
  const ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx'] // Enable parsing of JSX
  });
  const dependencies = new Set();

  ast.program.body.forEach(node => {
    if (node.type === 'ImportDeclaration') {
      const dependency = node.source.value;
      // Ensure the dependency name is valid
      if (!dependency.startsWith('.') && !dependency.startsWith('/')) {
        dependencies.add(dependency);
      }
    }
  });

  return Array.from(dependencies);
};

const createPackageJson = (dependencies) => {
  const packageJson = {
    name: "user-project",
    version: "1.0.0",
    main: "index.js",
    dependencies: {
      "react": "latest",
      "react-dom": "latest",
      "react-router-dom": "latest"  // Ensure react-router-dom is added
    }
  };

  dependencies.forEach(dep => {
    packageJson.dependencies[dep] = "latest"; // Use 'latest' for simplicity
  });

  return packageJson;
};

const installDependencies = (callback) => {
  exec('npm install', { cwd: uploadsDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`npm install error: ${error}`);
      callback(error);
      return;
    }
    console.log(`npm install stdout: ${stdout}`);
    console.error(`npm install stderr: ${stderr}`);
    callback(null);
  });
};

const checkClassesInHTML = (htmlContent) => {
  const $ = cheerio.load(htmlContent);
  const elements = $('p, div, img');
  let allHaveClass = true;
  let someHaveClass = false;

  elements.each((index, element) => {
    if ($(element).attr('class')) {
      someHaveClass = true;
    } else {
      allHaveClass = false;
    }
  });

  if (allHaveClass) {
    return 'all have';
  } else if (someHaveClass) {
    return 'not all';
  } else {
    return 'none';
  }
};

const generateRandomClassName = () => {
  return Math.random().toString(36).substring(2, 10);
};

const addClassToStylesheet = (className) => {
  const defaultStyle = `#${className} {\n  position:"absolute"; left: 0px; top: 10px; \n}\n`;
  fs.appendFileSync(stylesPath, defaultStyle);
};

const removeIrrelevantStyles = () => {
  const stylesContent = fs.readFileSync(stylesPath, 'utf8');
  const updatedStylesContent = stylesContent.replace(/#el-[a-z0-9]{7} {[^}]+}/g, '');
  fs.writeFileSync(stylesPath, updatedStylesContent);
};

const updateJSXWithClassNames = (jsxContent) => {
  const ast = babelParser.parse(jsxContent, { sourceType: 'module', plugins: ['jsx'] });
  let totalElements = 0;
  let elementsWithClassName = 0;

  traverse(ast, {
    JSXElement(path) {
      totalElements++;
      const classNameAttr = path.node.openingElement.attributes.find(attr => attr.name && attr.name.name === 'className');
      if (classNameAttr) {
        elementsWithClassName++;
      } else {
        const newClassName = "e" + generateRandomClassName();
        addClassToStylesheet(newClassName);
        path.node.openingElement.attributes.push({
          type: 'JSXAttribute',
          name: { type: 'JSXIdentifier', name: 'className' },
          value: { type: 'StringLiteral', value: newClassName }
        });
      }
    }
  });

  const updatedCode = generate(ast).code;

  if (elementsWithClassName === totalElements) {
    return { result: 'all have', code: updatedCode };
  } else if (elementsWithClassName > 0) {
    return { result: 'not all', code: updatedCode };
  } else {
    return { result: 'none', code: updatedCode };
  }
};

const checkAndUpdateClassesInAllFiles = () => {
  removeIrrelevantStyles();
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Error reading directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      if (path.extname(file) === '.html') {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const result = checkClassesInHTML(htmlContent);
        console.log(`Class check result for ${file}: ${result}`);
      } else if (path.extname(file) === '.js') {
        const jsxContent = fs.readFileSync(filePath, 'utf8');
        const { result, code } = updateJSXWithClassNames(jsxContent);
        fs.writeFileSync(filePath, code); // Update the file with added classNames
        console.log(`Class check result for ${file}: ${result}`);
      }
    });
  });
};

app.post('/save', (req, res) => {
  const { filename, content } = req.body;
  if (filename === 'index.js') {
    return res.status(400).send('Cannot modify index.js');
  }
  files[filename] = content;
  fs.writeFileSync(path.join(uploadsDir, filename), content);

  const dependencies = extractDependencies(content);
  const packageJson = createPackageJson(dependencies);
  fs.writeFileSync(path.join(uploadsDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  installDependencies((error) => {
    if (error) {
      res.status(500).send('Failed to install dependencies');
      return;
    }
    res.send('File saved and dependencies installed');
  });
});

app.get('/files', (req, res) => {
  res.json(files);
});

app.post('/compile', (req, res) => {
  const { filename, content } = req.body;
  if (filename === 'index.js') {
    return res.status(400).send('Cannot compile index.js');
  }
  files[filename] = content;
  fs.writeFileSync(path.join(uploadsDir, filename), content);

  const dependencies = extractDependencies(content);
  const packageJson = createPackageJson(dependencies);
  fs.writeFileSync(path.join(uploadsDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  installDependencies((error) => {
    if (error) {
      console.error('Failed to install dependencies:', error);
      res.status(500).send('Failed to install dependencies');
      return;
    }
    const compiler = webpack(webpackConfig);
    compiler.run((err, stats) => {
      if (err) {
        console.error('Webpack compilation error:', err);
        res.status(500).json({ errors: err.message });
      } else if (stats.hasErrors()) {
        console.error('Webpack stats errors:', stats.toJson().errors);
        res.status(500).json({ errors: stats.toJson().errors });
      } else {
        console.log('Webpack compilation successful');
        console.log(stats.toString({ colors: true })); // Log the stats
        res.json({ output: '/template' });
      }
    });
  });
});

app.get('/template', (req, res) => {
  console.log('Serving template.html');
  res.sendFile(path.join(uploadsDir, 'template.html'));
});

app.post('/save-styles', (req, res) => {
  const { styles } = req.body;
  Object.keys(files).forEach((filename) => {
    if (filename !== 'index.js' && filename.endsWith('.js')) {
      let content = files[filename];
      console.log('Original content for', filename, ':', content);
      content = updateComponentStyles(content, styles);
      console.log('Updated content for', filename, ':', content);
      files[filename] = content;
      fs.writeFileSync(path.join(uploadsDir, filename), content);
    }
  });

  res.send('Styles saved and components updated');
});

const updateComponentStyles = (content, styles) => {
  const ast = babelParser.parse(content, { sourceType: 'module', plugins: ['jsx'] });
  console.log('Parsed AST:', ast);

  const styleMap = new Map();
  const styleRegex = /\.([a-zA-Z0-9_-]+) {([^}]+)}/g;
  let match;
  while ((match = styleRegex.exec(styles)) !== null) {
    styleMap.set(match[1], match[2]);
  }

  traverse(ast, {
    JSXElement(path) {
      const idAttr = path.node.openingElement.attributes.find(attr => attr.name.name === 'id');
      if (idAttr) {
        const elementId = idAttr.value.value;
        const styleClass = elementId;
        const classAttr = path.node.openingElement.attributes.find(attr => attr.name.name === 'className');
        if (classAttr) {
          classAttr.value.value = `${classAttr.value.value} ${styleClass}`;
        } else {
          path.node.openingElement.attributes.push({
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'className' },
            value: { type: 'StringLiteral', value: styleClass },
          });
        }
        console.log('Updated JSXElement with class:', path.node.openingElement);
      }
    }
  });

  const updatedCode = generate(ast).code;
  console.log('Generated code after updating styles:', updatedCode);

  return updatedCode;
};

app.post('/extract-elements', (req, res) => {
  const { code } = req.body;
  const ast = babelParser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  const newElements = [];

  traverse(ast, {
    JSXElement(path) {
      const tagName = path.node.openingElement.name.name;
      const attributes = path.node.openingElement.attributes.reduce((acc, attr) => {
        if (attr.name && attr.value) {
          acc[attr.name.name] = attr.value.value;
        }
        return acc;
      }, {});
      const id = attributes.id || `el-${Math.random().toString(36).substring(2, 9)}`;
      const style = attributes.style ? JSON.parse(attributes.style) : { left: '0px', top: '0px', position: 'absolute' };

      newElements.push({
        id,
        tag: tagName,
        attrs: attributes,
        style,
        text: path.node.children.length > 0 ? path.node.children[0].value : '',
      });
    },
  });

  console.log('Extracted elements:', newElements);

  res.json(newElements);
});

app.listen(1000, () => {
  console.log('Server running on port 1000');
  checkAndUpdateClassesInAllFiles(); // Check and update classes in all files on server start
});