import PropTypes from 'prop-types'

function XMLTable({ data }) {
  if (!data || !data.processed_data) {
    return null
  }

  return (
    <div className="xml-summary">
      <div className="xml-header">
        <h3>Notas Fiscais Processadas</h3>
        <span className="note-count">{data.processed_data.length} notas</span>
      </div>
      <div className="xml-list">
        {data.processed_data.map((nf, index) => (
          <div key={index} className="xml-item">
            <div className="xml-item-header">
              <span className="nf-number">NF {nf.numeroNF}</span>
              <span className="nf-status">Processada</span>
            </div>
            <div className="xml-item-details">
              <div className="nf-party">
                <span className="party-label">Remetente:</span>
                <span className="party-name">{nf.remetente.nome}</span>
                <span className="party-location">{nf.remetente.endereco.municipio} - {nf.remetente.endereco.uf}</span>
              </div>
              <div className="nf-party">
                <span className="party-label">Destinatário:</span>
                <span className="party-name">{nf.destinatario.nome}</span>
                <span className="party-location">{nf.destinatario.endereco.municipio} - {nf.destinatario.endereco.uf}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

XMLTable.propTypes = {
  data: PropTypes.shape({
    processed_data: PropTypes.array
  })
}

export default XMLTable 