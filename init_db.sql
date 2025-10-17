-- Run this script in SQL Server to create tables used by the scaffold
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[insureds]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.insureds (
  id INT IDENTITY(1,1) PRIMARY KEY,
  insuredId INT NOT NULL, 
  fullName NVARCHAR(200) NULL,
  documentNumber NVARCHAR(40) NULL,
  countryISO NVARCHAR(10) NULL,
  email NVARCHAR(200) NULL,
  phone NVARCHAR(40) NULL,
  createdAt DATETIME DEFAULT GETDATE()
);

INSERT INTO dbo.insureds (insuredId, fullName, documentNumber, countryISO, email, phone)
VALUES
(01001, 'Javier Salazar', 'DNI12345678', 'PE', 'javier.salazar@example.com', '+51987654321'),
(01002, 'María Fernández', 'RUT22334455', 'CL', 'maria.fernandez@example.com', '+56998765432'),
(01003, 'Carlos Gómez', 'DNI87654321', 'PE', 'carlos.gomez@example.com', '+51976543210'),
(01004, 'Ana Torres', 'DNI99887766', 'PE', 'ana.torres@example.com', '+51911223344'),
(01005, 'Luis Ramírez', 'CUIT123456789', 'AR', 'luis.ramirez@example.com', '+541134567890'),
(01006, 'Sofía Rojas', 'RUT55667788', 'CL', 'sofia.rojas@example.com', '+56955443322'),
(01007, 'Miguel Castillo', 'DNI44556677', 'PE', 'miguel.castillo@example.com', '+51944332211'),
(01008, 'Camila Vargas', 'CUIT987654321', 'AR', 'camila.vargas@example.com', '+541198765432'),
(01009, 'Pedro Alvarado', 'RUT11223344', 'CL', 'pedro.alvarado@example.com', '+56999887766'),
(01010, 'Lucía Herrera', 'DNI66778899', 'PE', 'lucia.herrera@example.com', '+51988776655');

END
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[appointments]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.appointments (
  id INT IDENTITY(1,1) PRIMARY KEY,
  insuredId INT NOT NULL, 
  requestId VARCHAR(50),
  scheduleId INT,
  countryISO VARCHAR(5),
  status VARCHAR(50),
  createdAt DATETIME DEFAULT GETDATE(),
  processedAt DATETIME DEFAULT GETDATE()
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[appointments_pe]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.appointments_pe (
  id INT IDENTITY(1,1) PRIMARY KEY,
  insuredId VARCHAR(50),
  requestId VARCHAR(50),
  scheduleId INT,
  countryISO VARCHAR(5),
  status VARCHAR(50),
  processedAt DATETIME DEFAULT GETDATE()
);
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[appointments_cl]') AND type in (N'U'))
BEGIN
CREATE TABLE dbo.appointments_cl (
  id INT IDENTITY(1,1) PRIMARY KEY,
  insuredId INT NOT NULL, 
  requestId VARCHAR(50),
  scheduleId INT,
  countryISO VARCHAR(5),
  status VARCHAR(50),
  processedAt DATETIME DEFAULT GETDATE()
);
END
