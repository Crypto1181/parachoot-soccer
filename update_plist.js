const fs = require('fs');
let content = fs.readFileSync('ios/App/App/Info.plist', 'utf8');
if (!content.includes('ITSAppUsesNonExemptEncryption')) {
  content = content.replace('</dict>', '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n</dict>');
  fs.writeFileSync('ios/App/App/Info.plist', content);
  console.log("Updated Info.plist");
} else {
  console.log("Already exists");
}
