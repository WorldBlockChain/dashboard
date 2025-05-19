import React from 'react';
import AmountWidget from './AmountWidget';
import Panel from 'muicss/lib/react/panel';
import axios from 'axios';
import {totalCoins} from '../../common/lumens.js';

export default class HcxPrice extends AmountWidget {
  constructor(props) {
    super(props);
    // this.url = 'https://account.paybito.com/assetperformance/rest/PayBitoService/getHCXConsumed';
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.updateHcxAmount(),
      60*60*1000
    );
    this.updateHcxAmount();
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  updateHcxAmount() {
      const apiUrl = `https://account.paybito.com/hcx2ethversion/distributionBalance`;
    fetch(apiUrl)
    .then((res) => res.json())
    .then(response => {
      let distributionBalance = response.balance;
      let amount = distributionBalance;
      let code = "WBB";
      this.setState({amount, code, loading: false});
    });
  }

  renderName() {
    return <div className="hcxscan-dshboard">
      <span>Circulating Supply</span>
{/*      <a href={`${this.props.horizonURL}/ledgers/?order=desc&limit=1`} target="_blank" className="api-link">API</a>*/}
    </div>
  }
}
