export const endpoints = {
    employee: {
      development: 'http://localhost:5001/kensyu10097/us-central1/uploadEmployeeCSV',
      production: 'https://us-central1-kensyu10097.cloudfunctions.net/uploadEmployeeCSV'
    },
    salary: {
      development: 'http://localhost:5001/kensyu10097/us-central1/uploadSalaryCSV',
      production: 'https://us-central1-kensyu10097.cloudfunctions.net/uploadSalaryCSV'
    },
    standardRemuneration: {
      development: 'http://localhost:5001/kensyu10097/us-central1/standardRemuneration',
      production: 'https://us-central1-kensyu10097.cloudfunctions.net/uploadStandardRemunerationCSV'
    },
  };