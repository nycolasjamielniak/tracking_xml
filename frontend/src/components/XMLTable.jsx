import PropTypes from 'prop-types'

function XMLTable({ data }) {
  if (!data || !data.processed_data || data.processed_data.length === 0) {
    return null
  }

  const renderAddress = (address) => (
    <div>
      <p>{address.logradouro}, {address.numero}</p>
      <p>{address.bairro}</p>
      <p>{address.municipio} - {address.uf}</p>
      <p>CEP: {address.cep}</p>
    </div>
  )

  return (
    <div className="table-container">
      <h2>Notas Fiscais Processadas</h2>
      <table>
        <thead>
          <tr>
            <th>Número NF</th>
            <th>Remetente</th>
            <th>Destinatário</th>
            <th>Transporte</th>
          </tr>
        </thead>
        <tbody>
          {data.processed_data.map((nf, index) => (
            <tr key={index}>
              <td>{nf.numeroNF}</td>
              <td>
                <strong>{nf.remetente.nome}</strong>
                <br />
                CNPJ: {nf.remetente.cnpj}
                <br />
                {renderAddress(nf.remetente.endereco)}
              </td>
              <td>
                <strong>{nf.destinatario.nome}</strong>
                <br />
                CNPJ: {nf.destinatario.cnpj}
                <br />
                {renderAddress(nf.destinatario.endereco)}
              </td>
              <td>
                Volume: {nf.transporte.volume}
                <br />
                Peso Bruto: {nf.transporte.pesoBruto} kg
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.trip_structure && (
        <div className="trip-summary">
          <h2>Resumo da Viagem</h2>
          <p><strong>ID:</strong> {data.trip_structure.id}</p>
          <p><strong>Status:</strong> {data.trip_structure.status}</p>
          <h3>Paradas</h3>
          {data.trip_structure.paradas.map((parada, index) => (
            <div key={index} className="stop-info">
              <h4>{parada.tipo}</h4>
              <p>{parada.endereco.municipio} - {parada.endereco.uf}</p>
              <p>Notas: {parada.notas.map(n => n.numeroNF).join(', ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

XMLTable.propTypes = {
  data: PropTypes.shape({
    processed_data: PropTypes.array,
    trip_structure: PropTypes.object
  })
}

export default XMLTable 