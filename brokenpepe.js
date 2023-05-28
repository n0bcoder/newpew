"use strict";
const set = require("./setup.js");

const ethers = require("ethers");
const prompt = require('prompt-sync')({sigint: true});
const tokens = require("./tokens.js");
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
const tokenAbi = new ethers.utils.Interface(require("./tokenABI.json"));
const { ArgumentParser } = require('argparse');
// Add your arguments here
const parser = new ArgumentParser();
parser.add_argument("-a", "--a", {help :"Token address"})
parser.add_argument("-ak", "--ak", {help :"Select which account to use eg: -ak 2 (Second account) etc"})
parser.add_argument("-ak1", "--ak1", {help :"Select which backup account to use eg: -ak 2 (Second account) etc"})
parser.add_argument("-mw", "--mw", {action: "store_true", help :"Multiwallet"})
parser.add_argument('-wg', '--wg', {action: "store_true", help :"Anti Rug only"})
parser.add_argument('-rg', '--rg', {action: "store_true", help :"enable Antirug"})
parser.add_argument("-m1", "--m1", {action: "store_true", help :"Enable Buy By max tx or how many percent from total supply"})
parser.add_argument('-mp', "--mp", {help : "set max buy in percent"})
parser.add_argument("-n", "--n", {help : "Amount of BNB you want to spend"})
parser.add_argument("-td", "--td", {action :"store_true", help :"Snipe Enable trade"})
parser.add_argument("-md", "--md", {help :"Custom snipe with method id"})
parser.add_argument("-sp", "--sp", {help :"slippage"})
parser.add_argument("-cp", "--cp", {action :"store_true", help :"Snipe usd pair with bnb"})
parser.add_argument("-mb", "--mb", {help : "Multi Buy"})
parser.add_argument("-p", "--p", {help :"Select Your Pair eg: -p 1 for busd , -p 2 usdt, -p 3 for usdc, -p 4 for custom pair"})
parser.add_argument("-p1", "--p1", {help :"Select Your Custom Pair eg: Default None, p1 1 for bnb , -p1 2 busd, -p1 3 usdt, -p1 4 usdc, -p1 5 enable custom pair"})
const args = parser.parse_args();
// Argument Gang !!
let provider;
let router;
let TokenContract;
let maxTx;
let grasshopper;
let purchaseAmount;
let tokenAddress;
let pairA;
let pairB;
let DefaultWallet;
let DefaultPkey;
let Recepient;
let gun;

const startConnection = () => {
  provider = new ethers.providers.WebSocketProvider(set.node);
  router = new ethers.Contract(tokens.router, pcsAbi, provider);
  // Get token address from argument / user input
  if (args.a == undefined){
    let userInput = prompt('Enter address: ');
    if (userInput == ''){
      console.log('\x1b[31m%s\x1b[0m', 'Token address cannot be empty');
      process.exit(0);
    }else{
      tokenAddress = ethers.utils.getAddress(userInput);
    }
  }else{
    tokenAddress = ethers.utils.getAddress(args.a);
  };
  // purchaseAmount
  if (args.n == undefined){
    purchaseAmount = tokens.purchaseAmount * (10**18);
  }else{
    purchaseAmount = parseFloat(args.n) * (10**18);
  };
  // token contract
  TokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
  // default Pair
  if (args.p === undefined) {pairA = tokens.pairA[0];}
  else if (args.p === '1') {pairA = tokens.pairA[1]; }// busd
  else if (args.p === '2') {pairA = tokens.pairA[2]; }// usdt
  else if (args.p === '3') {pairA = tokens.pairA[3]; }// usdc
  else if (args.p.includes('0x')) {pairA = ethers.utils.getAddress(args.p);}// custom
  // custom Pair
  if (args.p1 === undefined){pairB = args.p1;}
  else if (args.p1 === '1') {pairB = tokens.pairB[0];}// wbnb
  else if (args.p1 === '2') {pairB = tokens.pairB[1];}// busd
  else if (args.p1 === '3') {pairB = tokens.pairB[2];}// usdt
  else if (args.p1 === '4') {pairB = tokens.pairB[3];}// usdc
  else if (args.p1.includes('0x')) {pairB = ethers.utils.getAddress(args.p1);}// custom
  //
  grasshopper = 0;
  //set enable / disable antirug mode
  gun = 0;
  if(args.wg){
    gun = 1;
    grasshopper = 1;
  }
  //
  const tokenInfo = async () =>{
    // Token informations
    try {
      const tokenName = await TokenContract.name();
      const totalSupply = await TokenContract.totalSupply();
      console.log('Name: ' + '\x1b[32m' + tokenName + '\x1b[0m');
      if(args.m1 == true){
        let getMax;
        if(args.mp == undefined){console.log('\x1b[31m%s\x1b[0m', 'Max tx is active, Default max transaction is 0,5% use -mp to change it !'); getMax = 0.5}
        if(args.mp != undefined){getMax = args.mp}
        maxTx = (totalSupply.toString() / 100)*getMax
        console.log('MaxTx :', maxTx.toLocaleString().replace(/,/g, ''))
      }
      console.log('\x1b[33m%s\x1b[0m', '=====================================');
    } catch (error) {
      // console.log(error);
      console.log('\x1b[31m%s\x1b[0m', 'Please enter contract address not wallet address !');
      process.exit(0);
    }
    console.log(
      "digging money ...... !!"
    );
  };
  tokenInfo();
  //multi Wallet setup
  let PickWallet = args.ak
  if (args.mw == true){PickWallet = 'mw'};
  //multi wallet backup
  let PicBackupkWallet = args.ak1
  // wallet in array
  DefaultWallet = set.addy
  DefaultPkey = set.pkey
  //////////////////
  //totalwallets
  let tw = PickWallet
  if (tw === undefined){DefaultWallet = [DefaultWallet[0]]; DefaultPkey = [DefaultPkey[0]]};
  if (tw != undefined){
    if (tw.match(/^\d+$/) !== null){ DefaultWallet = [DefaultWallet[parseInt(tw)-1]]; DefaultPkey = [DefaultPkey[parseInt(tw)-1]]};
    tw = String(tw);
    if (tw.includes(',')) {
      let combad = [];
      let combpk = [];
      let a = parseInt(tw.match(/(\d+),/)[1]) - 1;
      let b = parseInt(tw.match(/,(\d+)/)[1]);
      for (let i = a; i < b; i++) {combad.push(DefaultWallet[i]);}
      DefaultWallet = combad;
      for (let i = a; i < b; i++) {combpk.push(DefaultPkey[i]);}
      DefaultPkey = combpk;};
    if (tw.includes('.')) {
      let a = parseInt(tw.match(/(\d+)\./)[1]) - 1;
      let b = parseInt(tw.match(/\.\d+/)[0].slice(1)) - 1;
      DefaultWallet = [DefaultWallet[a], DefaultWallet[b]];
      DefaultPkey = [DefaultPkey[a], DefaultPkey[b]];}
    if (tw == 'mw') {DefaultWallet = set.addy; DefaultPkey = set.pkey;};
  };
  // backup wallet
  let BackupWallets;
  /////////////////
  let getDefaultwallet = set.addy;
  let btw = PicBackupkWallet
  if (btw == undefined){BackupWallets = [getDefaultwallet[0]]};
  if (btw != undefined){
    if (btw.match(/^\d+$/) !== null){ BackupWallets = [getDefaultwallet[parseInt(btw)-1]]};
    btw = String(btw);
    if (btw.includes(',')) {
      let combad = [];
      let a = parseInt(btw.match(/(\d+),/)[1]) - 1;
      let b = parseInt(btw.match(/,(\d+)/)[1]);
      for (let i = a; i < b; i++) {combad.push(getDefaultwallet[i]);}
      BackupWallets = combad;};
    if (btw.includes('.')) {
      let a = parseInt(btw.match(/(\d+)\./)[1]) - 1;
      let b = parseInt(btw.match(/\.\d+/)[0].slice(1)) - 1;
      BackupWallets = [getDefaultwallet[a], getDefaultwallet[b]];}
  };
  Recepient = DefaultWallet
  if (args.ak1 == undefined){Recepient = Recepient};
  if (args.ak1 != undefined){Recepient = BackupWallets};
  ///////////////////////////////////////
  function listener(){
    provider.on("pending", async (txHash) => {
      provider
        .getTransaction(txHash)
        .then(async (tx) => {
          if (gun === 0)
          {
            if (grasshopper === 0) {
              console.log("And, Yes..I am actually working...trust me...");
              grasshopper = 1;
            }
            if (tx && tx.to) {
              if (args.td === false){
                // Find method id for addLiquadity
                if (ethers.utils.getAddress(tx.to) === ethers.utils.getAddress(tokens.router)){
                  const re1 = new RegExp("^0xf305d719");
                  const re2 = new RegExp("^0xe8e33700");
                  if (re1.test(tx.data) || re2.test(tx.data)) {
                    const decodedInput = pcsAbi.parseTransaction({
                      data: tx.data,
                      value: tx.value,
                    });
                    if (
                      ethers.utils.getAddress(tokenAddress) ===
                      ethers.utils.getAddress(decodedInput.args[0]) ||
                      ethers.utils.getAddress(tokenAddress) ===
                      ethers.utils.getAddress(decodedInput.args[1])
                    ) {
                      if (args.rg){
                        provider.off("pending");
                        await BuyToken(tx);
                        gun = 1;
                        listener();
                      }else if(!args.rg)
                      {
                        console.log('Trigger event: https://bscscan.com/tx/'+txHash);
                        provider.off("pending");
                        await BuyToken(tx);
                      }
                    }
                  }
                }
                }
              if (args.td === true){
                // Find enable trade method id
                if (ethers.utils.getAddress(tx.to) === ethers.utils.getAddress(tokenAddress)){
                  //trade Enabled method id list
                  let enabledPattern = new RegExp("^0x0d295980|^0x0099d386|^0x5a854c21|^0x8a8c523c|^0x379ba1d9|^0x8f70ccf7|^0xc9567bf9|^0x02ac8168|^0x1d97b7cd|^0x8b7e01b6|^0x9b457b6d");
                  if (args.md === undefined){enabledPattern = enabledPattern;}
                  else if (args.md != undefined){enabledPattern = new RegExp(`^${args.md}`);}
                  if (enabledPattern.test(tx.data)){
                    if (args.rg)
                    {
                      provider.off("pending");
                      await BuyToken(tx);
                      gun = 1;
                      listener();
                    }
                    else if(!args.rg)
                    {
                      provider.off("pending");
                      await BuyToken(tx);
                    }
                    }
                  }
                }
              }
          }
          else if (gun === 1)
          {
            if (grasshopper === 1) {
              console.log('\x1b[31m' + 'Saving your ass...' + '\x1b[0m');
              grasshopper = 0;
            }
            if (tx && tx.to){
              if (ethers.utils.getAddress(tx.to) === ethers.utils.getAddress(tokens.router)){
                const re1 = new RegExp("^0x02751cec|^0xaf2979eb|^0xded9382a|^0x5b0d5984");
                const re2 = new RegExp("^0xbaa2abde|^0x2195995c");
                if (re1.test(tx.data) || re2.test(tx.data)) {
                  const decodedInput = pcsAbi.parseTransaction({
                    data: tx.data,
                    value: tx.value,
                  });
                  if (
                    ethers.utils.getAddress(tokenAddress) ===
                    ethers.utils.getAddress(decodedInput.args[0]) ||
                    ethers.utils.getAddress(tokenAddress) ===
                    ethers.utils.getAddress(decodedInput.args[1])
                  ) {
                    provider.off("pending");
                    await SellToken(tx);
                  }
                }
              }
            }
          }
          })
        .catch(() => {});
    });
    provider._websocket.on("error", () => {
      console.log(`Error. Attemptiing to Reconnect...`);
      setTimeout(listener, 1500);
    });
    provider._websocket.on("close", () => {
      console.log(`WebSocket Closed...Reconnecting...`);
      provider._websocket.terminate();
      setTimeout(listener, 1500);
    });
  }
  listener()
};

const Approve = async () => {
  const CheckApprove = async () => {
    let JoinHash = [];
    for (let i = 0; i < DefaultWallet.length; i++) {
      const Check = await TokenContract.allowance(DefaultWallet[i], tokens.router);
      if (Check._hex === "0x00") {
        const getPkey = new ethers.Wallet(DefaultPkey[i]);
        const accounts = getPkey.connect(provider);
        const ApproveContract = TokenContract.connect(accounts);
        const ApproveTx = await ApproveContract.approve(tokens.router, ethers.constants.MaxUint256);
        JoinHash.push(ApproveTx.hash);
      } else {
        continue;
      };
    }
    return JoinHash;
  }
  return await CheckApprove();
};

const BuyToken = async (txLP) => {
  const WETH = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  const Buy = async () => {
    // MultiBuy
    let mb = 1;
    if (args.mb == undefined){mb = 1;}
    else {mb = parseInt(args.mb);}
    let BuyHash = []
    for (let i = 0; i < mb; i++) {
      for (let i = 0; i < DefaultWallet.length; i++) {
        const getPkey = new ethers.Wallet(DefaultPkey[i]);
        const accounts = getPkey.connect(provider);
        const PcsRouter = router.connect(accounts);
        let TokenPair = [pairA, tokenAddress];
        if(pairA === WETH){
          let BuyEth;
          BuyEth = PcsRouter.swapExactETHForTokens;
          let amountOutMin = 0;
          // Convert BNB if True
          if (!args.cp) {TokenPair = [pairA, tokenAddress];}
          if (args.cp){TokenPair = [pairA, pairB, tokenAddress];}
          if (args.m1){
            BuyEth = PcsRouter.swapETHForExactTokens;
            amountOutMin = await maxTx.toLocaleString().replace(/,/g, '');
            if (pairB == undefined){TokenPair = [pairA, tokenAddress];}
            if (pairB != undefined){TokenPair = [pairA, pairB, tokenAddress];}
            };
          const RunTx = await BuyEth(
            amountOutMin,
            TokenPair,
            Recepient[i],
            Date.now() + 10000 * tokens.deadline,
            {
              value: purchaseAmount,
              gasLimit: tokens.gasLimit,
              gasPrice: txLP.gasPrice,
            }
          );
          console.log(`wallet ${i+1} https://bscscan.com/tx/${RunTx.hash}`);
          BuyHash.push(RunTx.hash);
        }
        else if(pairA !== WETH){
          let amountIn = 0;
          let amountOutMin = 0;
          let BuyNonEth;
          if (args.m1){
            BuyNonEth = PcsRouter.swapTokensForExactTokens;
            amountIn = await maxTx.toLocaleString().replace(/,/g, '');
            amountOutMin = parseFloat(args.n) * (10**18);
            if (pairB == undefined){TokenPair = [pairA, tokenAddress];}
            if (pairB != undefined){TokenPair = [pairA, pairB, tokenAddress];}
            }
          else{
            BuyNonEth = PcsRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens;
            amountIn = parseFloat(args.n) * (10**18);
            amountOutMin = 0;
            if (pairB == undefined){
              TokenPair = [pairA, tokenAddress];
            }
            if (pairB != undefined){
              TokenPair = [pairA, pairB, tokenAddress];
            }
            }
          const RunNonEthTx = await BuyNonEth(
            amountIn,
            amountOutMin,
            TokenPair,
            Recepient[i],
            Date.now() + 10000 * tokens.deadline,
            {
              gasLimit: tokens.gasLimit,
              gasPrice: txLP.gasPrice,
            }
          );
          console.log(`wallet ${i+1} https://bscscan.com/tx/${RunNonEthTx.hash}`);
          BuyHash.push(RunNonEthTx.hash);
        }
      }
    }
    return BuyHash;};
  async function GetReceipt() {
    const GetHash = await Buy();
    for (let i = 0; i < GetHash.length; i++) {
      const txhash = await provider.waitForTransaction(GetHash[i]);
      if (txhash.status === 1) {
        console.log(`wallet ${i+1}`+'\x1b[32m' + ' ✓' + '\x1b[0m');
        }
      if (txhash.status === 0) {
        console.log(`wallet ${i+1}`+'\x1b[31m' + ' X' + '\x1b[0m');
        }
      }
    };
  await GetReceipt();
  await Approve();
  console.log('Trigger event: https://bscscan.com/tx/'+txLP.hash);
  if (!args.rg){
    process.exit(0);
  }
};

const SellToken = async (txLP) => {
  const WETH = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  const sell = async () => {
    // MultiSell
    let sellHash = []
    for (let i = 0; i < DefaultWallet.length; i++){
      const getPkey = new ethers.Wallet(DefaultPkey[i]);
      const accounts = getPkey.connect(provider);
      const PcsRouter = router.connect(accounts);
      const balance = await TokenContract.balanceOf(DefaultWallet[i]);
      let TokenPair;
      let pair;
      let sellBoth;
      if(pairA === WETH){sellBoth = PcsRouter.swapExactTokensForETHSupportingFeeOnTransferTokens; pair = WETH;}
      else if(pairA !== WETH){sellBoth = PcsRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens; pair = pairA;}
      if(pairB !== undefined){
        if(pairB === WETH){sellBoth = PcsRouter.swapExactTokensForETHSupportingFeeOnTransferTokens; pair = WETH;}
        if(pairB !== WETH){sellBoth = PcsRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens; pair = pairB;}
      }
      TokenPair = [tokenAddress, pair]
      let amountInout = 0;
      if (args.sp !== undefined){
        const minReceive = await PcsRouter.getAmountsOut(balance, TokenPair)
        amountInout = parseInt(minReceive[1] - (minReceive[1]/100*parseFloat(args.sp)))
      }
      let gasSell;
      const getMaxgwei = tokens.sellGweimax * (10**9);
      const getRungwei = tokens.sellRun * (10**9);
      if (parseInt(txLP.gasPrice.toString()) >= getMaxgwei){
        console.log(`GasPrice too High more than ${getMaxgwei} gwei`)
        process.exit(0);
      }else if(txLP.gasPrice <= getMaxgwei){
        gasSell = parseInt(txLP.gasPrice.toString()) + getRungwei;
      }
      const RunTx = await sellBoth(
        balance.toLocaleString().replace(/,/g, ''),
        amountInout.toLocaleString().replace(/,/g, ''),
        TokenPair,
        DefaultWallet[i],
        Math.floor(Date.now() / 1000 * (60 * tokens.deadline)),
        {
          gasLimit: tokens.gasLimit,
          gasPrice: gasSell,
        }
      );
      console.log(`wallet ${i+1} https://bscscan.com/tx/${RunTx.hash}`);
      sellHash.push(RunTx.hash);
    }
    return sellHash;};
  async function GetReceipt() {
    const GetHash = await sell();
    for (let i = 0; i < GetHash.length; i++) {
      const txhash = await provider.waitForTransaction(GetHash[i]);
      if (txhash.status === 1) {
        console.log(`wallet ${i+1}`+'\x1b[32m' + ' ✓' + '\x1b[0m');
        }
      if (txhash.status === 0) {
        console.log(`wallet ${i+1}`+'\x1b[31m' + ' X' + '\x1b[0m');
        }
      }
    };
  await GetReceipt();
  console.log('Rug event: https://bscscan.com/tx/'+txLP.hash);
  process.exit(0);
};
startConnection();
