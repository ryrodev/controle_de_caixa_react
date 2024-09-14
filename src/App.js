import React, { useState, useEffect } from 'react';
import { useFloating, offset, flip, shift } from '@floating-ui/react';
import { saveAs } from 'file-saver';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import { Modal, Button } from 'react-bootstrap';
import Cookies from 'js-cookie';
import Papa from 'papaparse';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [predefinedDescriptions, setPredefinedDescriptions] = useState([
    'Salário',
    'Pagamento de Conta',
    'Compra',
    'Venda',
    'Transporte',
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 5;

  const { x, y, reference, strategy } = useFloating({
    middleware: [offset(10), flip(), shift()],
  });

  useEffect(() => {
    const savedTransactions = Cookies.get('transactions');
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
  }, []);

  const saveTransactionsToCookies = (newTransactions) => {
    Cookies.set('transactions', JSON.stringify(newTransactions), { expires: 7 });
    setTransactions(newTransactions);
  };

  const handleAddTransaction = (type) => {
    if (amount && description) {
      if (editingTransaction) {
        const updatedTransactions = transactions.map((transaction) =>
          transaction.id === editingTransaction.id
            ? { ...transaction, amount: parseFloat(amount), description, type }
            : transaction
        );
        saveTransactionsToCookies(updatedTransactions);
        setEditingTransaction(null);
      } else {
        const newTransaction = {
          id: Date.now(),
          type,
          amount: parseFloat(amount),
          description,
          date: new Date().toLocaleString('pt-BR')
        };
        saveTransactionsToCookies([...transactions, newTransaction]);
      }
      setAmount('');
      setDescription('');
    } else {
      alert('Por favor, preencha o valor e a descrição.');
    }
  };

  const handleEditTransaction = (transaction) => {
    setAmount(transaction.amount);
    setDescription(transaction.description);
    setEditingTransaction(transaction);
  };

  const handleDeleteTransaction = (id) => {
    const updatedTransactions = transactions.filter((transaction) => transaction.id !== id);
    saveTransactionsToCookies(updatedTransactions);
  };

  const handleAddDescription = () => {
    if (newDescription) {
      setPredefinedDescriptions([...predefinedDescriptions, newDescription]);
      setNewDescription('');
      setIsModalOpen(false);
    } else {
      alert('Por favor, preencha a descrição.');
    }
  };

  const handleSelectDescription = (e) => {
    setDescription(e.target.value);
  };

  const exportToCSV = () => {
    const csvRows = [
      ['ID', 'Tipo', 'Valor', 'Descrição', 'Data'],
      ...transactions.map(transaction => [
        transaction.id,
        transaction.type,
        transaction.amount,
        transaction.description,
        transaction.date
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'transacoes.csv');
  };

  const importFromCSV = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const importedTransactions = result.data.map((row) => ({
            id: Number(row.ID),
            type: row.Tipo,
            amount: parseFloat(row.Valor),
            description: row.Descrição,
            date: row.Data
          }));
          setTransactions(importedTransactions);
          saveTransactionsToCookies(importedTransactions);
        },
        error: (error) => {
          alert('Erro ao importar o arquivo: ' + error.message);
        }
      });
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const sortedTransactions = [...transactions].sort((a, b) => b.id - a.id);

  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = sortedTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

  const totalPages = Math.ceil(sortedTransactions.length / transactionsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="App container">
      <h1 className="titulo text-center mt-5">Controle de Caixa</h1>
      <div className="balance mb-5">
        <h2 className={transactions.reduce((acc, transaction) => {
          return transaction.type === 'entrada'
            ? acc + transaction.amount
            : acc - transaction.amount;
        }, 0) >= 0 ? 'saldo-positivo' : 'saldo-negativo'}>
          Saldo: R${' '}
          {transactions.reduce((acc, transaction) => {
            return transaction.type === 'entrada'
              ? acc + transaction.amount
              : acc - transaction.amount;
          }, 0).toFixed(2)}
        </h2>
      </div>

      <div className="transaction-input mb-5">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="form-control"
          placeholder="Valor"
        />
        <select
          value={description}
          onChange={handleSelectDescription}
          className="form-control"
        >
          <option value="">Selecione uma descrição</option>
          {predefinedDescriptions.map((desc) => (
            <option key={desc} value={desc}>
              {desc}
            </option>
          ))}
        </select>

        <br />

        <button
          onClick={openModal}
          className="btn btn-secondary"
          ref={reference}
        >
          Adicionar uma descrição
        </button>

        <br />
        <button
          onClick={() => handleAddTransaction('entrada')}
          className="btn btn-success"
        >
          <i className="bi bi-plus-circle"></i> {editingTransaction ? 'Salvar Entrada' : 'Adicionar Entrada'}
        </button>
        <button
          onClick={() => handleAddTransaction('saida')}
          className="btn btn-danger"
        >
          <i className="bi bi-dash-circle"></i> {editingTransaction ? 'Salvar Saída' : 'Adicionar Saída'}
        </button>
      </div>

      <div className="transaction-list">
        <ul>
          {currentTransactions.map((transaction) => (
            <li
              key={transaction.id}
              className={transaction.type === 'entrada' ? 'entrada' : 'saida'}
            >
              <span className={transaction.type === 'entrada' ? 'text-success' : 'text-danger'}>
                {transaction.type === 'entrada' ? <i className="bi bi-plus-circle"></i> : <i className="bi bi-dash-circle"></i>} R${' '}
                {transaction.amount.toFixed(2)}
              </span>
              <span> | {transaction.date}</span>
              <div className="transaction-description">
                <strong>Descrição:</strong> {transaction.description}
              </div>
              <button
                onClick={() => handleEditTransaction(transaction)}
                className="btn btn-success btn-sm ms-2"
              >
                <i className="bi bi-pencil-square"></i>
              </button>
              <button
                onClick={() => handleDeleteTransaction(transaction.id)}
                className="btn btn-danger btn-sm ms-2"
              >
                <i className="bi bi-trash3"></i>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Controles de paginação com números de página */}
      {totalPages > 1 && (
        <div className="pagination mt-4">
          <Button
            disabled={currentPage === 1}
            onClick={() => paginate(currentPage - 1)}
            className="btn btn-primary"
          >
            Anterior
          </Button>
          {Array.from({ length: totalPages }, (_, index) => (
            <Button
              key={index + 1}
              onClick={() => paginate(index + 1)}
              className={`btn ${currentPage === index + 1 ? 'btn-secondary' : 'btn-outline-secondary'}`}
            >
              {index + 1}
            </Button>
          ))}
          <Button
            disabled={currentPage === totalPages}
            onClick={() => paginate(currentPage + 1)}
            className="btn btn-primary"
          >
            Próximo
          </Button>
        </div>
      )}

      <div className="actions mt-4">
        <label className="btn btn-info me-2">
          Importar Transações
          <input
            type="file"
            accept=".csv"
            onChange={importFromCSV}
            style={{ display: 'none' }}
          />
        </label>
        <button
          onClick={exportToCSV}
          className="btn btn-info"
        >
          Exportar
        </button>
      </div>

      <Modal
        show={isModalOpen}
        onHide={closeModal}
        dialogClassName="modal-90w"
        aria-labelledby="example-custom-modal-styling-title"
        style={{
          position: strategy,
          top: y ?? 0,
          left: x ?? 0,
          transform: strategy === 'fixed' ? 'translateY(-50%)' : 'none',
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Adicionar Nova Descrição</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="form-control"
            rows={3}
            placeholder="Digite a nova descrição..."
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleAddDescription}>
            Salvar Descrição
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
