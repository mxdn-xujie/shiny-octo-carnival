import { ParseServerOptions } from 'parse-server';
import * as path from 'path';

const parseConfig: ParseServerOptions = {
  databaseURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/voice-chat',
  appId: process.env.PARSE_APP_ID,
  masterKey: process.env.PARSE_MASTER_KEY,
  serverURL: process.env.PARSE_SERVER_URL || 'http://localhost:3500/parse',
  cloud: path.join(__dirname, '../cloud/main.js'),
  allowClientClassCreation: false,
  fileUpload: {
    enableForAnonymousUser: false,
    enableForAuthenticatedUser: true,
    fileExtensions: ['.mp3', '.wav', '.ogg', '.m4a']
  },
  filesAdapter: {
    module: '@parse/fs-files-adapter',
    options: {
      filesSubDirectory: 'files'
    }
  },
  verifyUserEmails: false,
  publicServerURL: process.env.PARSE_SERVER_URL || 'http://localhost:3500/parse',
  auth: {
    jwt: {
      enable: true
    }
  },
  maxUploadSize: process.env.MAX_UPLOAD_SIZE || '10mb'
};

export default parseConfig;