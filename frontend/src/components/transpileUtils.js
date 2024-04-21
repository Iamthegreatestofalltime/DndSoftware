/* global Babel */
// transpileUtils.js
const transpileCode = (code) => {
    try {
      let transformedCode = Babel.transform(code, {
        presets: ['react-app']
      }).code;
      transformedCode = transformedCode.replace(
        /export default/g,
        'const compiledComponent ='
      );
      return transformedCode;
    } catch (err) {
      console.error('Error transpiling code:', err);
      return '';
    }
  };
  
  export default transpileCode;