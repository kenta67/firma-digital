# INFORME TÉCNICO SOBRE EL FUNCIONAMIENTO DEL SISTEMA DE FIRMA DIGITAL, MODELOS DE ENCRIPTACIÓN Y PROTOCOLOS DE VALIDACIÓN OFICIAL

**Implementación del Estándar PAdES, Criptografía Asimétrica RSA y Verificación conforme a la Ley N° 164 del Estado Plurinacional de Bolivia**

---

**Autor:** Equipo de Desarrollo y Criptografía Aplicada  
**Institución:** Plataforma FirmaDigital Bolivia Studio  
**Materia / Área:** Seguridad Informática, Criptografía y Gobierno Electrónico  
**Destinatario:** Dirección Técnica de Evaluación y Auditoría  
**Fecha:** Octubre de 2026  
**Sede:** La Paz, Estado Plurinacional de Bolivia  

---

## Resumen

El presente informe describe de manera conceptual, operativa y técnica el funcionamiento integral del sistema **FirmaDigital Bolivia Studio**. El propósito central de la plataforma es garantizar los principios de autenticidad, integridad, no repudio y confidencialidad en documentos electrónicos en formato PDF mediante la aplicación de firmas digitales avanzadas conforme al estándar internacional **PAdES** (*PDF Advanced Electronic Signatures*) y la normativa boliviana consagrada en la **Ley N° 164**. Se detalla el modelo de encriptación asimétrica implementado a través de pares de claves **RSA** (2048 y 4096 bits), la función resumen criptográfica **SHA-256**, la emisión de certificados de identidad **X.509 v3**, el almacenamiento protegido en contenedores **PKCS#12**, el procedimiento matemático de cálculo sobre rangos de bytes (*ByteRange*) y los mecanismos de consulta en tiempo real frente al portal estatal oficial `validar.firmadigital.bo` de la Agencia de Gobierno Electrónico y Tecnologías de Información y Comunicación (AGETIC).

*Palabras clave:* Firma digital, PAdES, Criptografía asimétrica, RSA, SHA-256, Certificados X.509, Ley 164, AGETIC, Validación de integridad, PKCS#12.

---

## 1. Introducción

En la sociedad de la información moderna, la digitalización de trámites y expedientes administrativos demanda mecanismos fiables que sustituyan con total solvencia a la firma manuscrita sobre soporte de papel. En el Estado Plurinacional de Bolivia, la Ley General de Telecomunicaciones, Tecnologías de Información y Comunicación (Ley N° 164) y su Decreto Supremo Reglamentario N° 1793 establecen la validez legal y probatoria de la firma digital, dotándola de la misma fuerza obligatoria que un documento físico firmado a mano.

El sistema analizado ha sido concebido para proporcionar una solución completa de infraestructura de clave pública (PKI) y firma electrónica en entorno web. Permite la creación y gestión de múltiples usuarios con sus respectivos perfiles institucionales, la generación segura de pares de llaves mediante OpenSSL, el estampado visual y criptográfico de informes técnicos en formato PDF, su visualización interactiva y, fundamentalmente, la validación transparente frente a los servicios oficiales de verificación estatal.

---

## 2. Funcionamiento Operativo del Sistema

Desde el punto de vista funcional, el sistema opera como una estación de trabajo criptográfica integral articulada en cinco componentes interactivos sin requerir la intervención manual de comandos complejos por parte de los usuarios finales:

1. **Módulo de Gestión de Identidades y Usuarios:**  
   Permite dar de alta a múltiples firmantes registrando sus datos de identificación oficial: nombres y apellidos, cédula de identidad, cargo, unidad organizacional, institución pública o privada y correo electrónico. Cada usuario registrado cuenta con su propio almacén criptográfico independiente.

2. **Generador de Llaves y Certificados (Laboratorio OpenSSL):**  
   Orquesta la creación de pares de claves asimétricas de alta seguridad y la construcción de certificados electrónicos de identidad estructurados conforme a los requerimientos de la nomenclatura boliviana, documentando en tiempo real las operaciones ejecutadas para fines didácticos y de auditoría.

3. **Motor de Firma de Informes PDF (Estándar PAdES):**  
   Recibe un documento PDF (ya sea generado automáticamente como informe técnico oficial o suministrado por el usuario) y aplica la firma digital avanzada. Esto incluye la colocación de un estampado visual con el tricolor nacional y un código QR verificable, seguido de la inyección de la firma matemática en el archivo binario.

4. **Visualizador de Documentos PDF de Alta Fidelidad:**  
   Ofrece un entorno integrado para examinar el informe antes y después de la aplicación de la firma, posibilitando la navegación por páginas, el control de ampliación (zoom) y la comparación inmediata entre el documento original en blanco y el documento firmado.

5. **Validador Conectado a la Plataforma Estatal AGETIC:**  
   Establece un puente directo con el servicio de validación de Bolivia (`validar.firmadigital.bo`), enviando el archivo firmado para someterlo a la auditoría de los cuatro filtros de seguridad definidos por la normativa boliviana.

---

## 3. Modelos y Algoritmos de Encriptación Utilizados

La seguridad, autenticidad e inviolabilidad del sistema se basan en una combinación de algoritmos de criptografía asimétrica, funciones resumen unidireccionales y protocolos de encapsulamiento estandarizados a nivel internacional:

### 3.1. Criptografía Asimétrica de Clave Pública (RSA 2048 y 4096 bits)

A diferencia de la criptografía simétrica (donde se utiliza la misma clave para cifrar y descifrar), el sistema utiliza el algoritmo asimétrico **RSA** (*Rivest, Shamir y Adleman*) conforme al estándar PKCS#1 v2.1. Este modelo genera matemáticamente dos llaves complementarias e inseparables:

- **Llave Privada (*Private Key*):** Permanece bajo el exclusivo control y custodia del titular. Es utilizada exclusivamente para calcular la firma digital de los documentos. Es computacionalmente imposible deducir la llave privada a partir de la llave pública.
- **Llave Pública (*Public Key*):** Es de acceso irrestricto y se encuentra contenida dentro del certificado digital. Permite que cualquier entidad receptora (o el portal del Estado) verifique con certeza matemática que la firma fue creada únicamente por el poseedor de la llave privada correspondiente.

El sistema soporta longitudes de clave de **2048 bits** (recomendado para uso estándar por su óptimo balance entre velocidad y seguridad) y **4096 bits** (empleado en infraestructuras críticas que requieren resistencia a muy largo plazo).

### 3.2. Función Resumen Criptográfica (Hash SHA-256)

Firmar directamente un documento de varios megabytes sería computacionalmente ineficiente. Por esta razón, el sistema emplea la función hash segura **SHA-256** (*Secure Hash Algorithm de 256 bits*, FIPS PUB 180-4). Esta función matemática posee dos propiedades cardinales:

- **Unicidad e Irreversibilidad:** Convierte cualquier documento PDF, sin importar su tamaño, en una huella digital alfanumérica fija de 64 caracteres hexadecimales (256 bits). Es computacionalmente inviable reconstruir el PDF original a partir de su resumen hash.
- **Efecto Avalancha (Resistencia a Modificaciones):** Si un documento firmado sufre la alteración de un solo espacio en blanco, una coma o un píxel, el nuevo hash calculado diferirá de forma radical y completa del hash original, provocando que la firma digital sea detectada de inmediato como inválida o corrupta.

### 3.3. Certificados Digitales de Identidad (Estándar X.509 versión 3)

Una clave pública por sí sola es una secuencia abstracta de números. Para vincular jurídicamente esa clave pública con una persona física o servidor público de Bolivia, se emplea un Certificado Digital **X.509 v3** (RFC 5280). Este certificado actúa como la "cédula de identidad digital" del firmante e incorpora los siguientes metadatos:

- **Nombre Común (CN - *Common Name*):** Nombres y apellidos completos del firmante.
- **Número de Serie / Identificador:** Cédula de Identidad (C.I.) o NIT en Bolivia.
- **Organización y Unidad (O / OU):** Institución de pertenencia (ej. ADSIB, UMSA, Contraloría) y área técnica.
- **Cargo Oficial (*Title*):** Rol o nombramiento formal dentro de la entidad.
- **Ubicación Geográfica y País:** Ciudad de emisión y código de país (`C=BO` para Bolivia).
- **Periodo de Validez:** Fechas exactas de inicio (*notBefore*) y expiración (*notAfter*).
- **Puntos de Revocación (CRL y OCSP):** Direcciones URL oficiales donde los validadores verifican en tiempo real si el certificado sigue habilitado.

### 3.4. Almacén de Claves Seguro PKCS#12 (.p12 / .pfx)

Para transportar y resguardar la llave privada y el certificado sin exponerlos en texto claro, el sistema empaqueta ambos elementos en un contenedor estándar **PKCS#12** (*Personal Information Exchange Syntax Standard*). Este almacén se encuentra fuertemente cifrado mediante una contraseña o PIN maestro, impidiendo que terceros no autorizados puedan sustraer la clave privada del firmante.

---

## 4. Mecanismo de Aplicación de la Firma Digital en el Documento PDF

La firma digital de un documento no consiste en pegar una imagen escaneada o un dibujo de una rúbrica. En el sistema, la firma digital es una estructura criptográfica integrada en el propio estándar PDF según la especificación internacional **PAdES** (*PDF Advanced Electronic Signatures* - ETSI EN 319 142 e ISO 32000-1). El proceso se desarrolla de la siguiente forma:

### 4.1. Incorporación del Estampado Visual Informativo

Antes de la firma binaria, el sistema dibuja sobre la página seleccionada un recuadro formal de firma digital que contiene los datos legibles del firmante, la referencia a la Ley N° 164, la fecha y hora oficial con huso horario boliviano (GMT-04:00) y un código QR dinámico. Dicho código QR redirige directamente a la plataforma `validar.firmadigital.bo`, permitiendo que cualquier persona que imprima el documento en papel pueda escanearlo con un teléfono móvil y verificar su autenticidad en línea.

### 4.2. Definición del Rango de Bytes (ByteRange)

Una firma digital no puede firmarse a sí misma, pues al incrustar la firma en el archivo el peso y el contenido del PDF cambiarían, invalidando el cálculo hash. Para resolver esto, el estándar PAdES utiliza la tabla de rangos de bytes:

$$\text{/ByteRange } [Offset_1, Length_1, Offset_2, Length_2]$$

El archivo PDF se divide en dos bloques contiguos y se reserva un espacio hueco intermedio en la etiqueta `/Contents`.

### 4.3. Firma Criptográfica del Resumen y Empaquetado CMS

1. El sistema calcula el hash SHA-256 exacto de todos los bytes del PDF especificados en el `/ByteRange` (excluyendo el espacio reservado para la firma).
2. A continuación, este hash es cifrado utilizando la llave privada RSA del firmante.
3. Dicho resultado se empaqueta en una estructura PKCS#7 / CMS (*Cryptographic Message Syntax*) detached, junto con el certificado X.509 v3 del firmante y la estampa de tiempo.
4. Finalmente, el paquete binario hexadecimal resultante se inserta dentro de la etiqueta `/Contents` sin modificar ninguno de los bytes restantes del documento. El PDF queda formal y legalmente cerrado: cualquier intento de alterar el texto, borrar una línea o modificar un importe modificará los bytes cubiertos por el `/ByteRange`, rompiendo la firma de inmediato.

---

## 5. Criterios de Validación Oficial en Bolivia (validar.firmadigital.bo)

Cuando el documento firmado se somete a validación en el portal oficial del Estado Plurinacional de Bolivia, el motor de auditoría de AGETIC somete el archivo a cuatro comprobaciones independientes:

1. **Documento Auténtico (Integridad Criptográfica) — Estado: VÁLIDO / CONFORME (Verde):**  
   El validador extrae el certificado incrustado, obtiene la clave pública, descifra la firma matemática y recalcula el hash SHA-256 de los bytes del documento. Si ambos coinciden, el sistema concluye con certeza absoluta que el documento es auténtico y no ha sufrido ninguna modificación desde que fue firmado.

2. **Periodo de Vigencia — Estado: VÁLIDO / CONFORME (Verde):**  
   Comprueba cronológicamente que la firma fue estampada en un instante temporal en el que el certificado digital se encontraba activo, es decir, posterior a su fecha de emisión y anterior a su fecha de expiración.

3. **Estado de Revocación — Estado: VÁLIDO / CONFORME (Verde):**  
   El validador examina las extensiones del certificado para ubicar la dirección de la Lista de Revocación de Certificados (CRL) y del servicio OCSP de Bolivia. El sistema consulta estas fuentes para certificar que la llave del firmante no ha sido dada de baja o anulada.

4. **Cadena de Confianza — Estado: INFORMACIÓN / OBSERVACIÓN (Aviso Normativo):**  
   Evalúa la jerarquía de emisión. En Bolivia, la Ley N° 164 estipula que para tener plena validez jurídica estatal obligatoria ante tribunales y trámites públicos, el certificado debe haber sido expedido formalmente por la Entidad Certificadora Pública (AGETIC / ADSIB) mediante token de hardware homologado. Cuando se utilizan llaves generadas localmente con OpenSSL en entornos de desarrollo, académicos o de prueba, el portal confirma que la firma es matemáticamente válida e inalterable, advirtiendo con transparencia técnica que la entidad emisora no es la CA raíz estatal.

---

## 6. Conclusiones

La arquitectura implementada en **FirmaDigital Bolivia Studio** cumple con rigor los más altos estándares mundiales de seguridad y firma de documentos electrónicos. Al articular el algoritmo asimétrico RSA (2048/4096 bits), la función hash SHA-256, el estándar de empaquetado PAdES y el protocolo X.509 v3 con soporte de revocación CRL y OCSP, el sistema entrega documentos blindados contra cualquier intento de manipulación o falsificación.

Asimismo, la capacidad de verificar los documentos tanto de forma interna como directamente en el portal oficial `validar.firmadigital.bo` proporciona transparencia, confiabilidad técnica y pleno alineamiento con el marco legal de telecomunicaciones y tecnologías de información vigente en el Estado Plurinacional de Bolivia.

---

## Referencias

Agencia de Gobierno Electrónico y Tecnologías de Información y Comunicación [AGETIC]. (2021). *Guía técnica para la implementación de firma digital y validación en sistemas del Estado Plurinacional de Bolivia*. AGETIC. https://firmadigital.bo

Asamblea Legislativa Plurinacional de Bolivia. (2011). *Ley General de Telecomunicaciones, Tecnologías de Información y Comunicación (Ley N° 164 del 8 de agosto de 2011)*. Gaceta Oficial del Estado Plurinacional de Bolivia. http://gacetaoficialdebolivia.gob.bo

European Telecommunications Standards Institute [ETSI]. (2016). *Electronic Signatures and Infrastructures (ESI); PAdES digital signatures; Part 1: Building blocks and PAdES baseline signatures (ETSI EN 319 142-1 V1.1.1)*. ETSI Standards. https://www.etsi.org

Housley, R., Polk, W., Ford, W., & Solo, D. (2008). *Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile (RFC 5280)*. Internet Engineering Task Force (IETF). https://doi.org/10.17487/RFC5280

Housley, R. (2009). *Cryptographic Message Syntax (CMS) (RFC 5652)*. Internet Engineering Task Force (IETF). https://doi.org/10.17487/RFC5652

International Organization for Standardization [ISO]. (2008). *Document management — Portable document format — Part 1: PDF 1.7 (ISO 32000-1:2008)*. ISO. https://www.iso.org/standard/51502.html

Jonsson, J., & Kaliski, B. (2003). *Public-Key Cryptography Standards (PKCS) #1: RSA Cryptography Specifications Version 2.1 (RFC 3447)*. Internet Engineering Task Force (IETF). https://doi.org/10.17487/RFC3447

Moriarty, K., Kaliski, B., Jonsson, J., & Rusch, A. (2016). *PKCS #12: Personal Information Exchange Syntax v1.1 (RFC 7292)*. Internet Engineering Task Force (IETF). https://doi.org/10.17487/RFC7292

National Institute of Standards and Technology [NIST]. (2015). *Secure Hash Standard (SHS) (FIPS PUB 180-4)*. U.S. Department of Commerce. https://doi.org/10.6028/NIST.FIPS.180-4

Presidencia del Estado Plurinacional de Bolivia. (2013). *Decreto Supremo N° 1793 del 13 de noviembre de 2013 (Reglamento a la Ley N° 164 para el sector de Tecnologías de Información y Comunicación)*. Gaceta Oficial del Estado Plurinacional de Bolivia. http://gacetaoficialdebolivia.gob.bo
