const express = require('express');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config');
const cors = require('cors');
const babelParser = require('@babel/parser');
const { exec } = require('child_process');

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');
const templatesDir = path.join(__dirname, 'templates');

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

app.listen(1000, () => console.log('Server running on port 1000'));