export type RagPreview = {
  documentId: string;
  title: string;
  intro: string;
  parentCount: number;
  childCount: number;
  estimatedEmbeddingTokens: number;
  estimatedEmbeddingCost: number;
};

export function RagPreviewTable({ previews }: { previews: RagPreview[] }) {
  return (
    <div className="preview-table-wrap">
      <table className="preview-table">
        <caption>RAG 文档预检结果（{previews.length} 份文档）</caption>
        <thead>
          <tr>
            <th scope="col">文档</th>
            <th scope="col">父块</th>
            <th scope="col">子块</th>
            <th scope="col">预估 Token</th>
            <th scope="col">预估费用</th>
          </tr>
        </thead>
        <tbody>
          {previews.map((preview) => (
            <tr key={preview.documentId}>
              <th scope="row">
                <span className="preview-title">{preview.title}</span>
                <span className="preview-file">{preview.documentId}</span>
                {preview.intro && <span className="preview-intro">{preview.intro}</span>}
              </th>
              <td>{preview.parentCount}</td>
              <td>{preview.childCount}</td>
              <td>{preview.estimatedEmbeddingTokens.toLocaleString()}</td>
              <td>¥{preview.estimatedEmbeddingCost.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
