require('console-stamp')(console);


const instagramprivateapi = require("instagram-private-api");
//import { 
//  IgApiClient, 
//  IgCheckpointError, 
//  IgLoginTwoFactorRequiredError,
//  IgResponseError
//} from 'instagram-private-api'

const inquirer = require( 'inquirer');
const Bluebird = require( 'bluebird');
//const { delay } = require( 'bluebird'

const ig = new instagramprivateapi.IgApiClient()

async function login () {
  const { username, password } = await inquirer.prompt([
    { 
      type: 'input', 
      name: 'username', 
      message: 'Usuario' 
    },
    { 
      type: 'password', 
      name: 'password', 
      message: 'Password',
      mask: true
    }
  ])
  // Login
  await Bluebird.try(async () => {
    ig.state.generateDevice(username);
    await ig.simulate.preLoginFlow();
    const account = await ig.account.login(username, password);
    console.log('login OK')
  })
  // Two-factor
  .catch(instagramprivateapi.IgLoginTwoFactorRequiredError, async (e) => {
    const { twoFactorMethod, twoFactorCode } = await inquirer.prompt([
      { 
        type: 'list', 
        name: 'twoFactorMethod', 
        message: '2FA method',
        choices: [
          { name: 'Authenticator', value: '0' },
          { name: 'SMS', value: '1' }
        ]
      },
      { 
        type: 'input', 
        name: 'twoFactorCode', 
        message: '2FA code' 
      }
    ])
    await ig.account.twoFactorLogin({
      twoFactorIdentifier: e.response.body.two_factor_info.two_factor_identifier,
      verificationMethod: twoFactorMethod,
      verificationCode: twoFactorCode,
      username: username
    })
    console.log('two-factor login OK')
  })
  // Challenge
  .catch(instagramprivateapi.IgCheckpointError, async () => {
    console.log('checkpoint', ig.state.checkpoint); // Checkpoint info here
    console.log('challenge', ig.state.challenge)
    await ig.challenge.auto(true); // Requesting sms-code or click "It was me" button
    console.log('checkpoint', ig.state.checkpoint); // Challenge info here
    console.log('challenge', ig.state.challenge)
    const { code } = await inquirer.prompt([
      { type: 'input', name: 'code', message: 'Challenge code' }
    ])
    console.log(await ig.challenge.sendSecurityCode(code));
    console.log('challenge', ig.state.challenge)
  })
}

// Main
(async () => {
  await login ();
  const followers = await ig.feed.pendingFriendships().items()
  console.log(followers)
})()