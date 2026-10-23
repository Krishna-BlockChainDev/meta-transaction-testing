                 USER
                  │
                  │
          1. Create Permit
                  │
                  ▼
          EIP-712 typed data
                  │
                  │
          2. Sign with
          User private key
                  │
                  ▼
             Signature
             (v,r,s)
                  │
                  │
          3. Send signature
             to backend
                  │
                  ▼
              RELAYER
                  │
                  │ 4. Validate
                  │    signature
                  │
                  │ 5. Submit tx
                  │    with Relayer PK
                  ▼
             ERC-20
                  │
                  │
          6. Verify EIP-712
                  │
                  ▼
          Recover signer
                  │
                  ▼
               USER
                  │
                  │
          7. Verify nonce
                  │
                  ▼
          8. Verify deadline
                  │
                  ▼
          9. Update allowance
                  │
                  ▼
         10. transferFrom()
                  │
                  ▼
              RECIPIENT
