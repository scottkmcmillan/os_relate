# Data Processing Best Practices

Effective data processing is crucial for machine learning success.

## Data Collection

### Sources
- Databases (SQL, NoSQL)
- APIs (REST, GraphQL)
- Files (CSV, JSON, Parquet)
- Streaming (Kafka, Kinesis)

### Quality Considerations
- Completeness
- Accuracy
- Consistency
- Timeliness

## Data Cleaning

### Common Issues
1. **Missing Values**
   - Imputation strategies
   - Deletion approaches

2. **Outliers**
   - Statistical detection (IQR, Z-score)
   - Domain-based filtering

3. **Duplicates**
   - Exact matching
   - Fuzzy matching

## Feature Engineering

### Techniques
- **Normalization**: Scale features to [0,1]
- **Standardization**: Zero mean, unit variance
- **Encoding**: One-hot, label encoding
- **Binning**: Convert continuous to categorical

### Feature Selection
- Correlation analysis
- Mutual information
- Recursive feature elimination

## Data Pipelines

```
Raw Data → Cleaning → Transformation → Feature Engineering → Model Ready
```

### Tools
- Apache Spark
- Pandas
- Dask
- Apache Beam

---
Tags: data-processing, ETL, feature-engineering, data-cleaning
