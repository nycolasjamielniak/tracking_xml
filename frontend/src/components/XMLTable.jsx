import PropTypes from 'prop-types'

function XMLTable({ data }) {
  if (!data || data.length === 0) {
    return null
  }

  // Pega todas as chaves únicas dos objetos
  const allKeys = new Set()
  data.forEach(obj => {
    Object.keys(obj).forEach(key => allKeys.add(key))
  })
  const headers = Array.from(allKeys)

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {headers.map(header => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              {headers.map(header => (
                <td key={`${index}-${header}`}>
                  {typeof item[header] === 'object' 
                    ? JSON.stringify(item[header])
                    : item[header] || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

XMLTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object)
}

export default XMLTable 