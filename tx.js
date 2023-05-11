const { ethers } = require("ethers");
const { BigNumber } = require('ethers');

// walletsetup
const pew = require("./bsett.js");
const addy = pew.addy
const pkey = pew.pkey
const node = pew.node
const GLimit = pew.GasLimit
const provider = new ethers.providers.WebSocketProvider(node);
const { ArgumentParser } = require('argparse');
// Add your arguments here
const parser = new ArgumentParser();
parser.add_argument("-a", "--a", {help :"Token address"})
parser.add_argument("-ak", "--ak", {help :"Select which account to use eg: -ak 2 (Second account) etc"})
parser.add_argument("-ak1", "--ak1", {help :"Select which backup account to use eg: -ak 2 (Second account) etc"})
parser.add_argument("-mw", "--mw", {action: "store_true", help :"Multiwallet"})
parser.add_argument('-wg', '--wg', {action: "store_true", help :"Anti Rug Watcher"})
parser.add_argument("-m1", "--m1", {action: "store_true", help :"Enable Buy By max tx or how many percent from total supply"})
parser.add_argument('-mp', "--mp", {help : "set max buy in percent"})
parser.add_argument("-n", "--n", {help : "Amount of BNB you want to spend"})
parser.add_argument("-td", "--td", {action :"store_true", help :"Snipe Enable trade"})
parser.add_argument("-md", "--md", {help :"Custom snipe with method id"})
parser.add_argument("-cp", "--cp", {action :"store_true", help :"Snipe usd pair with bnb"})
parser.add_argument("-mb", "--mb", {help : "Multi Buy"})
parser.add_argument("-p", "--p", {help :"Select Your Pair eg: -p 1 for busd , -p 2 usdt, -p 3 for usdc, -p 4 for custom pair"})
parser.add_argument("-p1", "--p1", {help :"Select Your Custom Pair eg: Default None, p1 1 for bnb , -p1 2 busd, -p1 3 usdt, -p1 4 usdc, -p1 5 enable custom pair"})
args = parser.parse_args()

wallet = new ethers.Wallet(pkey[0]);
account = wallet.connect(provider);
// gwei
let gweibuy
let maxtx

// token_address_setup
function token() {
  var token = args.a
  if (args.a == undefined){
    console.log('Please add token address before run this bot ! for example -a token address')
    process.exit(0);
  }else{
    token = ethers.utils.getAddress(args.a)
  }
  return token;
};

// token_contract
const tokenAbi = new ethers.utils.Interface(require("./token.json"));
async function GetTokenContract() {
  const TokenContract = new ethers.Contract(
          token(),
          tokenAbi,
          account
      );
  return TokenContract;
};

// PancakeRouterv2
const PancakeRouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
const pcsAbi = new ethers.utils.Interface(require("./abi.json"));
async function PancakeRouterv2() {
  const RouterContract = new ethers.Contract(
          PancakeRouterAddress,
          pcsAbi,
          account
      );
  return RouterContract;
};

// DefaultPairSetup
function DefaultPair(){
  let pair = args.a
  if (args.p == undefined){
    pair = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' //wbnb
  };
  if (args.p == '1'){
    pair = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'//busd
  };
  if (args.p == '2'){
    pair = '0x55d398326f99059fF775485246999027B3197955'//usdt
  };
  if (args.p == '3'){
    pair = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'//usdc
  };
  return pair;
};

// CustomPairSetup
function CustomPair(){
  let Cpair = undefined
  if (args.p1 == undefined){
    Cpair = undefined
  };
  if (args.p1 == '1'){
    Cpair = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'//wbnb
  };
  if (args.p1 == '2'){
    Cpair = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'//busd
  };
  if (args.p1 == '3'){
    Cpair = '0x55d398326f99059fF775485246999027B3197955'//usdt
  };
  if (args.p1 == '4'){
    Cpair = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'//usdc
  };
  return Cpair;
};

//wallet setup
function GetWallet(){
  let PickWallet = args.ak
  if (args.ak == undefined){
    PickWallet = undefined
  };
  if (args.ak != undefined){
    PickWallet = args.ak
  };
  if (args.mw == true){
    PickWallet = 'mw'
  };
  return PickWallet;
};
function GetBackupWallet(){
  let PicBackupkWallet = args.ak1
  if (args.ak1 == undefined){
    PicBackupkWallet = args.ak1
  };
  if (args.ak != undefined){
    PicBackupkWallet = args.ak1
  };
  return PicBackupkWallet;
};

// wallet in array
function Multiwallets(){
  let DefaultWallet = addy
  let DefaultPkey = pkey
  //totalwallets
  let tw = GetWallet()
  if (tw == undefined){
    DefaultWallet = [DefaultWallet[0]]
    DefaultPkey = [DefaultPkey[0]]
  };
  if (tw != undefined){
    if (tw.match(/^\d+$/) !== null){
      DefaultWallet = [DefaultWallet[parseInt(tw)-1]]
      DefaultPkey = [DefaultPkey[parseInt(tw)-1]]
    };
    tw = String(tw);
    if (tw.includes(',')) {
      let combad = [];
      let combpk = [];
      let a = parseInt(tw.match(/(\d+),/)[1]) - 1;
      let b = parseInt(tw.match(/,(\d+)/)[1]);
      for (let i = a; i < b; i++) {
        combad.push(DefaultWallet[i]);
      }
      DefaultWallet = combad;
      for (let i = a; i < b; i++) {
        combpk.push(DefaultPkey[i]);
      }
      DefaultPkey = combpk;
    };
    if (tw.includes('.')) {
      let a = parseInt(tw.match(/(\d+)\./)[1]) - 1;
      let b = parseInt(tw.match(/\.\d+/)[0].slice(1)) - 1;
      DefaultWallet = [DefaultWallet[a], DefaultWallet[b]];
      DefaultPkey = [DefaultPkey[a], DefaultPkey[b]];
    }
    if (tw == 'mw') {
      DefaultWallet = addy;
      DefaultPkey = pkey;
    };
  };
  return [DefaultWallet, DefaultPkey];
};


// backup wallet
function BackupWallets(){
  let DefaultWallet = addy
  //totalwallets
  let tw = GetBackupWallet()
  if (tw == undefined){
    DefaultWallet = [DefaultWallet[0]]
  };
  if (tw != undefined){
    if (tw.match(/^\d+$/) !== null){
      DefaultWallet = [DefaultWallet[parseInt(tw)-1]]
    };
    tw = String(tw);
    if (tw.includes(',')) {
      let combad = [];
      let a = parseInt(tw.match(/(\d+),/)[1]) - 1;
      let b = parseInt(tw.match(/,(\d+)/)[1]);
      for (let i = a; i < b; i++) {
        combad.push(DefaultWallet[i]);
      }
      DefaultWallet = combad;
    };
    if (tw.includes('.')) {
      let a = parseInt(tw.match(/(\d+)\./)[1]) - 1;
      let b = parseInt(tw.match(/\.\d+/)[0].slice(1)) - 1;
      DefaultWallet = [DefaultWallet[a], DefaultWallet[b]];
    }
  };
  return DefaultWallet;
};


// recepient token
function RecepientToken(){
  let Recepient = Multiwallets()
  if (args.ak1 == undefined){
    Recepient = Recepient[0]
  };
  if (args.ak1 != undefined){
    Recepient = BackupWallets()
  };
  return Recepient;
}

async function t_info() {
  const contract = await GetTokenContract()
  const tokenName = await contract.name();
  const totalsupply = await contract.totalSupply();
  console.log('Name : '+tokenName)
  console.log('Address : '+token())
  console.log('Watching transactions from txpool .......')
  if(args.m1 == true){
    if(args.mp == undefined){max = 0.5}
    if(args.mp != undefined){max = args.mp}
    maxtx = (totalsupply.toString() / 100)*max
    try{console.log('MaxTx :',maxtx.toLocaleString().replace(/,/g, ''))}
    catch (e){}
  }
};



// ApproveToken
async function ApproveToken() {
  const Addresses = Multiwallets()[0];
  const PrivateKey = Multiwallets()[1];
  const TokenContract = await GetTokenContract();
  async function CheckApprove() {
    let JoinHash = [];
    for (let i = 0; i < Addresses.length; i++) {
      const Check = await TokenContract.allowance(Addresses[i], PancakeRouterAddress);
      if (Check._hex === "0x00") {
        const wallet = new ethers.Wallet(PrivateKey[i]);
        const account = wallet.connect(provider);
        const ApproveContract = TokenContract.connect(account);
        const ApproveTx = await ApproveContract.approve(PancakeRouterAddress, ethers.constants.MaxUint256);
        JoinHash.push(ApproveTx.hash);
      } else {
        continue;
      };
    }
    return JoinHash;
  }
  return await CheckApprove();
}

// BuyToken
async function BuyToken(){
  const Addresses = Multiwallets()[0];
  const PrivateKey = Multiwallets()[1];
  const Recepient = RecepientToken();
  const wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
  const GetDefaultPair = DefaultPair();
  const GetCustomPair = CustomPair()
  const PcsRouterv2 = await PancakeRouterv2();
  const Token = token()
  async function Buy(){
    // MultiBuy
    let mb = 1;
    if (args.mb == undefined){
      mb = 1;
    }
    else {
      mb = parseInt(args.mb)
    }
    let BuyHash = []
    for (let i = 0; i < mb; i++) {
      for (let i = 0; i < Addresses.length; i++) {
        const wallet = new ethers.Wallet(PrivateKey[i]);
        const account = wallet.connect(provider);
        const PcsRouter = PcsRouterv2.connect(account);
        let TokenPair = [GetDefaultPair, Token];
        const PurchaseAmount = parseFloat(args.n) * (10**18)
        if(GetDefaultPair === wbnb){
          BuyEth = PcsRouter.swapExactETHForTokens;
          let amountOutMin = 0;
          // Convert BNB if True
          if (!args.cp) {
            TokenPair = [GetDefaultPair, Token];
            }
          if (args.cp){
            TokenPair = [GetDefaultPair, GetCustomPair, Token];
            }
          if (args.m1){
            BuyEth = PcsRouter.swapETHForExactTokens;
            amountOutMin = await maxtx;
            if (GetCustomPair == undefined){
              TokenPair = [GetDefaultPair, Token];
            }
            if (GetCustomPair != undefined){
              TokenPair = [GetDefaultPair, GetCustomPair, Token];
            }
            }
          const RunTx = await BuyEth(
            amountOutMin.toString(),
            TokenPair,
            Recepient[i],
            (Math.floor(Date.now() / 1000) + 10000),
            {
              value: PurchaseAmount.toString(),
              gasLimit: GLimit,
              gasPrice: gweibuy,
            }
          );
          console.log(`wallet ${i+1} https://bscscan.com/tx/${RunTx.hash}`);
          BuyHash.push(RunTx.hash);
        }
        else if(DefaultPair !== wbnb){
          let amountIn = 0;
          let amountOutMin = 0;
          if (args.m1){
            BuyNonEth = PcsRouter.swapTokensForExactTokens;
            amountIn = await maxtx;
            amountOutMin = parseFloat(args.n) * (10**18);
            if (GetCustomPair == undefined){
              TokenPair = [GetDefaultPair, Token];
            }
            if (GetCustomPair != undefined){
              TokenPair = [GetDefaultPair, GetCustomPair, Token];
            }
            }
          else{
            BuyNonEth = PcsRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens;
            amountIn = parseFloat(args.n) * (10**18);
            amountOutMin = 0;
            if (GetCustomPair == undefined){
              TokenPair = [GetDefaultPair, Token];
            }
            if (GetCustomPair != undefined){
              TokenPair = [GetDefaultPair, GetCustomPair, Token];
            }
            }
          const RunNonEthTx = await BuyNonEth(
            amountIn.toString(),
            amountOutMin.toString(),
            TokenPair,
            Recepient[i],
            (Math.floor(Date.now() / 1000) + 10000),
            {
              gasLimit: GLimit,
              gasPrice: gweibuy,
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
        console.log(`wallet ${i+1} ✅ success`);
        }
      if (txhash.status === 0) {
        console.log(`wallet ${i+1} ❌ failed`);
        }
      }
    }
  await GetReceipt();
  await ApproveToken();
};

async function snipe(){
  return new Promise((resolve, reject) => {
    provider.on("pending", async (txHash) => {
      try {
        const tx = await provider.getTransaction(txHash);
        gweibuy = tx.gasPrice.toString()
        if (args.td == false){
          if (tx.to == PancakeRouterAddress){
            const re1 = new RegExp("^0xf305d719");
            if (re1.test(tx.data)){
                const decode = pcsAbi.parseTransaction({
                    data: tx.data,
                    value: tx.value,
                })
                if (decode.args[0] === token()){
                  provider.off("pending");
                  await BuyToken();
                  resolve();
                };
            }
          }
          }
        if (args.td == true){
          if (tx.to == token()){
            let TDisabled = new RegExp("^0x0d295980|^0x0099d386|^0x5a854c21|^0x8a8c523c|^0x379ba1d9|^0x8f70ccf7|^0xc9567bf9|^0x02ac8168|^0x1d97b7cd|^0x8b7e01b6");
            if (args.md == undefined){
              TDisabled = TDisabled
            }
            else if (args.md != undefined){
              TDisabled = new RegExp('^' + RegExp.escape(args.md))
            }
            if (TDisabled.test(tx.data)){
              provider.off("pending");
              await BuyToken();
              resolve();
            }
          }
        }

      }
      catch (e){
      }
    });
  });
};


async function main() {
    if (args.wg == false){
        await t_info();
        await snipe();
        // await BuyToken();
        process.exit(0);
    }else{
        console.log('Rug Watcher Running !!');
        process.exit(0);
    }
}

main();
