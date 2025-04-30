import React from 'react';
import AmountWidget from './AmountWidget';
import Panel from 'muicss/lib/react/panel';
import axios from 'axios';

export default class HcxHeldByCash extends AmountWidget {
  constructor(props) {
    super(props);
    // this.url = 'https://account.paybito.com/assetperformance/rest/PayBitoService/getHCXConsumed';
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.updateHcxHeldByCash(),
      60*60*1000
    );
    this.updateHcxHeldByCash();
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  updateHcxHeldByCash() {
      const apiUrl = `https://account.paybito.com/hcx2ethversion/heldByOrg`;
    fetch(apiUrl)
    .then((res) => res.json())
    .then(response => {
      let heldByCashBalance = response.balance;
      let amount = heldByCashBalance;
      let code = "WBB";
      this.setState({amount, code, loading: false});
    });
}

  renderName() {
    return <div className="hcxscan-dshboard">
      <span>Total held by HashCash</span>
{/*      <a href={`${this.props.horizonURL}/ledgers/?order=desc&limit=1`} target="_blank" className="api-link">API</a>*/}
    </div>
  }
}
