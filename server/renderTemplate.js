var request = require('request'),
  fs = require('fs'),
  webdriver = require('selenium-webdriver'),
  url = require('url'),
  template = require('lodash-node/modern/utilities/template'),
  uuid = require('node-uuid');

//var path = 'doodle.pdf';

function createTemplate(req, res) {
  var hashData = {
    renderId: uuid.v4(),
    templateId: req.params.templateId,
    dataSetId: req.query.dataSetId
  };

  var hashTemplate = template('#/renderTemplate/${templateId}?dataSetId=${dataSetId}&renderId=${renderId}', hashData);

  var templateToRender = url.format({
    protocol: 'http',
    hostname: 'localhost',
    port: 3000,
    pathname: '/',
    hash: hashTemplate
  });

  var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

  driver.get(templateToRender)
    .then(null, renderError); // catch error

  driver.wait(waitForTitle, 1000000)
    .then(renderSuccess)
    .then(null, renderError);

  driver.quit();

  function waitForTitle() {
    return driver.getTitle().then(function(title) {
      return (title === 'doneRendering' || title === 'failedRendering') ? title : false;
    });
  }

  function renderSuccess(value) {
    console.log(value);
    if (value === 'doneRendering') {
      res.redirect('/downloadTemplate/' + hashData.renderId);
    } else {
      res.send(500, 'Failed Rendering');
    }
  }

  function renderError(error) {
    res.send(500, error);
    driver.quit();
  }
}

function renderTemplate(req, res) {
  var options = {
    url: 'http://default-environment-n3qmimrip3.elasticbeanstalk.com/V1/renderRequest',
    form: {
      fileType: 'PDF',
      svgFile: req.body.svgTemplate
    }
  };

  var postRequest = request.post(options, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      console.log('--- failed rendering');
      res.send(500);
    }
  });

  var fileStream = fs.createWriteStream(req.body.renderId + '.pdf');

  // take the streamed file from postRequest and save it
  postRequest.pipe(fileStream);

  // redirect once file is done saving
  fileStream.on('finish', function(err) {
    res.send(200);
  });
}

function downloadTemplate(req, res) {

  // uncomment to open in browser
//      var readStream = fs.createReadStream(path);
//      readStream.pipe(res);

  // uncomment to download file
  res.download(req.params.renderId + '.pdf', 'renderedTemplate.pdf', function(err) {
    fs.unlink(req.params.renderId + '.pdf');

    if (err) {
      // handle error, keep in mind the response may be partially-sent
      // so check res.headerSent
    } else {
      // decrement a download credit etc
    }
  });

//  var stream = fs.createReadStream(path, {bufferSize: 64 * 1024})
//  stream.pipe(res);
//
//  stream.on('close', function(){
//    if (!had_error) fs.unlink(path);
//  });
}

//function getFilePath(req) {
//  return  [req.params.templateId, req.query.dataSetId].join('_');
//}

module.exports = {
  createTemplate: createTemplate,
  renderTemplate: renderTemplate,
  downloadTemplate: downloadTemplate
};