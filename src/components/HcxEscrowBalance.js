import React from 'react';
import AmountWidget from './AmountWidget';
import Panel from 'muicss/lib/react/panel';
import axios from 'axios';

export default class HcxEscrowBalance extends AmountWidget {
  constructor(props) {
    super(props);
    // this.url = 'https://account.paybito.com/assetperformance/rest/PayBitoService/getHCXConsumed';
  }

  componentDidMount() {
    this.timerID = setInterval(
      () => this.updateHcxEscrow(),
      60*60*1000
    );
    this.updateHcxEscrow();
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  updateHcxEscrow() {
      const apiUrl = `https://account.paybito.com/hcx2ethversion/escrowBalance`;
      fetch(apiUrl)
      .then((res) => res.json())
      .then(response => {
        let hcxEscrowBalance = response.balance;
        let amount = hcxEscrowBalance;
        let code = "WBB";
        this.setState({amount, code, loading: false});
      });
  }

  renderName() {
    return <div className="hcxscan-dshboard">
      <span>Total held in Escrow</span>
{/*      <a href={`${this.props.horizonURL}/ledgers/?order=desc&limit=1`} target="_blank" className="api-link">API</a>*/}
    </div>
  }
}
