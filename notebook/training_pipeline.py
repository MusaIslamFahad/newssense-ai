# ==============================================================================
# NewsSense AI — Training Pipeline (run on Kaggle GPU / Google Colab)
# ==============================================================================
# Dataset: https://www.kaggle.com/datasets/shafin11027/newspaper-headline-tag
# Goal: Train DistilBERT on 90K news headlines, push to HuggingFace Hub,
#       and serve via the Next.js web app.
# ==============================================================================

# ── CELL 1: Environment setup ──────────────────────────────────────────────────
# %pip install -q transformers datasets huggingface_hub scikit-learn
# %pip install -q lime shap matplotlib seaborn wordcloud

import os, time, warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from wordcloud import WordCloud
import re, html
from bs4 import BeautifulSoup

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.metrics import (
    classification_report, f1_score, confusion_matrix,
    ConfusionMatrixDisplay, roc_auc_score
)
import joblib

import torch
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    Trainer, TrainingArguments, EarlyStoppingCallback
)
from datasets import Dataset

from huggingface_hub import login, HfApi

warnings.filterwarnings('ignore')
print("PyTorch:", torch.__version__)
print("CUDA:", torch.cuda.is_available())
print("Device:", "GPU ✓" if torch.cuda.is_available() else "CPU ✗ (switch runtime!)")


# ── CELL 2: Load & initial inspection ─────────────────────────────────────────
df = pd.read_csv('/kaggle/input/datasets/shafin11027/newspaper-headline-tag/Training_data_5.csv')

print("=" * 55)
print(f"Dataset shape : {df.shape}")
print(f"Columns       : {list(df.columns)}")
print(f"Null values   :\n{df.isnull().sum()}")
print(f"\nCategory counts:\n{df['News Topic'].value_counts()}")
print("=" * 55)
df.head()


# ── CELL 3: Robust text cleaning pipeline ──────────────────────────────────────
def clean_text(text: str) -> str:
    """
    Multi-step cleaning:
    1. Strip HTML tags (BeautifulSoup)
    2. Unescape HTML entities (&amp; → &)
    3. Remove URLs
    4. Collapse whitespace
    5. Lowercase
    """
    if not isinstance(text, str) or not text.strip():
        return ""

    text = BeautifulSoup(text, "html.parser").get_text()
    text = html.unescape(text)
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = text.lower().strip()
    return text

df['clean_headline'] = df['News Headline'].apply(clean_text)

# Drop empty rows after cleaning
n_before = len(df)
df = df[df['clean_headline'].str.len() >= 5].reset_index(drop=True)
print(f"Dropped {n_before - len(df)} malformed rows. Remaining: {len(df):,}")

# Headline length stats
df['text_len'] = df['clean_headline'].str.len()
df['word_count'] = df['clean_headline'].str.split().str.len()
print(df[['text_len', 'word_count']].describe().round(1))


# ── CELL 4: Exploratory Data Analysis ─────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(18, 5))
fig.suptitle('Exploratory Data Analysis', fontsize=14, fontweight='bold', y=1.02)

# 4a. Class distribution
counts = df['News Topic'].value_counts()
axes[0].barh(counts.index, counts.values, color='steelblue', edgecolor='white', linewidth=0.5)
axes[0].set_title('Class Distribution')
axes[0].set_xlabel('Count')
for bar, val in zip(axes[0].patches, counts.values):
    axes[0].text(bar.get_width() + 50, bar.get_y() + bar.get_height()/2,
                 f'{val:,}', va='center', fontsize=8)

# 4b. Class imbalance ratio
imbalance = counts.max() / counts.min()
print(f"\nImbalance ratio (max/min): {imbalance:.1f}x")
print("→ Using class_weight='balanced' to compensate.")

# 4c. Headline length distribution per category
df.boxplot(column='word_count', by='News Topic', ax=axes[1], rot=45, fontsize=7)
axes[1].set_title('Word Count by Category')
axes[1].set_xlabel('')

# 4d. Word count histogram
axes[2].hist(df['word_count'], bins=40, color='steelblue', edgecolor='white', linewidth=0.3)
axes[2].set_title('Headline Word Count Distribution')
axes[2].set_xlabel('Words')
axes[2].axvline(df['word_count'].median(), color='red', linestyle='--', label=f"Median: {df['word_count'].median():.0f}")
axes[2].legend()

plt.tight_layout()
plt.savefig('eda.png', dpi=150, bbox_inches='tight')
plt.show()


# ── CELL 5: Word cloud per category ───────────────────────────────────────────
fig, axes = plt.subplots(2, 5, figsize=(20, 8))
axes = axes.flatten()

for ax, topic in zip(axes, df['News Topic'].unique()):
    topic_text = " ".join(df[df['News Topic'] == topic]['clean_headline'])
    wc = WordCloud(
        width=400, height=200,
        background_color='white',
        max_words=80,
        colormap='Blues'
    ).generate(topic_text)
    ax.imshow(wc, interpolation='bilinear')
    ax.set_title(topic, fontsize=9, fontweight='bold')
    ax.axis('off')

plt.suptitle('Most Frequent Words per Category', fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig('wordclouds.png', dpi=120, bbox_inches='tight')
plt.show()


# ── CELL 6: Label encoding & TF-IDF features ──────────────────────────────────
le = LabelEncoder()
y = le.fit_transform(df['News Topic'])
print(f"Classes ({len(le.classes_)}):", list(le.classes_))

tfidf = TfidfVectorizer(
    max_features=15000,
    ngram_range=(1, 2),          # unigrams + bigrams
    sublinear_tf=True,           # log(1 + tf) — reduces impact of high freq terms
    min_df=3,                    # ignore very rare terms
    strip_accents='unicode',
)
X = tfidf.fit_transform(df['clean_headline'])
print(f"TF-IDF matrix: {X.shape}")


# ── CELL 7: Stratified train/test split ───────────────────────────────────────
X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
    X, y, df.index,
    test_size=0.2,
    random_state=42,
    stratify=y            # preserves class ratios in both splits
)
print(f"Train: {X_train.shape[0]:,}  |  Test: {X_test.shape[0]:,}")

# Verify stratification
train_dist = pd.Series(y_train).value_counts(normalize=True).sort_index()
test_dist  = pd.Series(y_test).value_counts(normalize=True).sort_index()
print("\nStratification check (distributions should match):")
print(pd.DataFrame({'train': train_dist, 'test': test_dist}).round(3))


# ── CELL 8: Classical baseline — Logistic Regression with 5-fold CV ───────────
print("=" * 55)
print("BASELINE MODEL: Logistic Regression")
print("=" * 55)

lr = LogisticRegression(
    max_iter=1000,
    class_weight='balanced',     # handles class imbalance
    C=5.0,                       # regularization (tuned)
    solver='lbfgs',
    multi_class='multinomial',
    n_jobs=-1,
)

# 5-fold stratified cross-validation
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(lr, X_train, y_train, cv=cv, scoring='f1_macro', n_jobs=-1)
print(f"\n5-Fold CV F1 (macro): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
print(f"Fold scores: {[f'{s:.4f}' for s in cv_scores]}")

# Final fit on full train set
lr.fit(X_train, y_train)
lr_pred = lr.predict(X_test)
lr_f1 = f1_score(y_test, lr_pred, average='macro')
lr_report = classification_report(y_test, lr_pred, target_names=le.classes_)
print(f"\nTest F1 (macro): {lr_f1:.4f}")
print("\nClassification Report:")
print(lr_report)


# ── CELL 9: Second baseline — Linear SVM ──────────────────────────────────────
print("=" * 55)
print("BASELINE MODEL: Linear SVM")
print("=" * 55)

svm = LinearSVC(
    max_iter=3000,
    class_weight='balanced',
    C=1.0,
)
svm.fit(X_train, y_train)
svm_pred = svm.predict(X_test)
svm_f1 = f1_score(y_test, svm_pred, average='macro')
svm_report = classification_report(y_test, svm_pred, target_names=le.classes_)
print(f"\nTest F1 (macro): {svm_f1:.4f}")
print(svm_report)


# ── CELL 10: Model comparison chart ───────────────────────────────────────────
# Per-class F1 comparison
lr_report_dict  = classification_report(y_test, lr_pred,  target_names=le.classes_, output_dict=True)
svm_report_dict = classification_report(y_test, svm_pred, target_names=le.classes_, output_dict=True)

classes = le.classes_
lr_f1s  = [lr_report_dict[c]['f1-score']  for c in classes]
svm_f1s = [svm_report_dict[c]['f1-score'] for c in classes]

x = np.arange(len(classes))
width = 0.35

fig, axes = plt.subplots(1, 2, figsize=(16, 5))

# Per-class comparison
axes[0].bar(x - width/2, lr_f1s,  width, label='Logistic Regression', color='steelblue', alpha=0.85)
axes[0].bar(x + width/2, svm_f1s, width, label='Linear SVM',          color='darkorange', alpha=0.85)
axes[0].set_xticks(x)
axes[0].set_xticklabels(classes, rotation=40, ha='right', fontsize=8)
axes[0].set_ylabel('F1 Score')
axes[0].set_title('Per-Class F1: LR vs SVM')
axes[0].legend()
axes[0].set_ylim(0, 1.05)

# Macro F1 overall
models = ['Logistic\nRegression', 'Linear\nSVM', 'DistilBERT\n(to be trained)']
f1s    = [lr_f1, svm_f1, None]
colors = ['steelblue', 'darkorange', 'mediumseagreen']

bars = axes[1].bar(
    [m for m, f in zip(models, f1s) if f is not None],
    [f for f in f1s if f is not None],
    color=[c for c, f in zip(colors, f1s) if f is not None],
    alpha=0.85,
    width=0.4
)
axes[1].bar('DistilBERT\n(to be trained)', 0.95, color='mediumseagreen', alpha=0.3,
            linestyle='--', edgecolor='mediumseagreen', linewidth=2, width=0.4,
            label='Expected')
for bar in bars:
    axes[1].text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                 f'{bar.get_height():.3f}', ha='center', va='bottom', fontsize=10)
axes[1].set_ylabel('Macro F1 Score')
axes[1].set_title('Overall Model Performance')
axes[1].set_ylim(0, 1.05)
axes[1].axhline(0.9, color='gray', linestyle=':', linewidth=1, label='Target')
axes[1].legend()

plt.tight_layout()
plt.savefig('model_comparison.png', dpi=150, bbox_inches='tight')
plt.show()


# ── CELL 11: Confusion matrix (best classical model) ──────────────────────────
best_classical_pred = lr_pred if lr_f1 >= svm_f1 else svm_pred
best_classical_name = 'Logistic Regression' if lr_f1 >= svm_f1 else 'Linear SVM'

cm = confusion_matrix(y_test, best_classical_pred, normalize='true')

fig, ax = plt.subplots(figsize=(12, 9))
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=le.classes_)
disp.plot(ax=ax, cmap='Blues', colorbar=True, xticks_rotation=40)
ax.set_title(f'Normalized Confusion Matrix — {best_classical_name}', fontsize=13, pad=12)
plt.tight_layout()
plt.savefig('confusion_matrix_classical.png', dpi=150, bbox_inches='tight')
plt.show()

# Show most confused pairs
cm_raw = confusion_matrix(y_test, best_classical_pred)
np.fill_diagonal(cm_raw, 0)
confused_idx = np.unravel_index(cm_raw.argmax(), cm_raw.shape)
print(f"\nMost confused pair: '{le.classes_[confused_idx[0]]}' → predicted as '{le.classes_[confused_idx[1]]}'"
      f"  ({cm_raw[confused_idx]} times)")


# ── CELL 12: Error analysis ────────────────────────────────────────────────────
df_test = df.iloc[idx_test].copy().reset_index(drop=True)
df_test['pred'] = le.inverse_transform(best_classical_pred)
df_test['true'] = le.inverse_transform(y_test)
df_test['correct'] = df_test['pred'] == df_test['true']
df_test['confidence'] = lr.predict_proba(X_test).max(axis=1)

errors = df_test[~df_test['correct']].sort_values('confidence', ascending=False)

print("=" * 70)
print(f"Total errors: {len(errors):,} / {len(df_test):,}  ({len(errors)/len(df_test)*100:.1f}%)")
print("=" * 70)
print("\nTop 10 HIGH-CONFIDENCE mistakes (model was wrong but very sure):")
print(errors[['clean_headline', 'true', 'pred', 'confidence']].head(10).to_string(index=False))

print("\nError breakdown by true category:")
print(errors['true'].value_counts())


# ── CELL 13: Save classical models ────────────────────────────────────────────
joblib.dump(lr,    'lr_model.joblib')
joblib.dump(tfidf, 'tfidf_vectorizer.joblib')
joblib.dump(le,    'label_encoder.joblib')
print("Classical models saved.")


# ── CELL 14: Transformer fine-tuning — DistilBERT ─────────────────────────────
print("=" * 55)
print("TRAINING: DistilBERT fine-tune")
print("=" * 55)

MODEL_NAME = 'distilbert-base-uncased'
NUM_LABELS = len(le.classes_)
MAX_LEN = 64         # headlines are short; 64 tokens captures ~95% of them
EPOCHS = 4
BATCH_TRAIN = 64
BATCH_EVAL = 128

# Prepare HuggingFace Dataset
train_df_hf = df.iloc[idx_train][['clean_headline', 'News Topic']].reset_index(drop=True)
test_df_hf  = df.iloc[idx_test][['clean_headline',  'News Topic']].reset_index(drop=True)

# Add numeric labels
train_df_hf['label'] = le.transform(train_df_hf['News Topic'])
test_df_hf['label']  = le.transform(test_df_hf['News Topic'])

train_dataset = Dataset.from_pandas(train_df_hf[['clean_headline', 'label']])
test_dataset  = Dataset.from_pandas(test_df_hf[['clean_headline',  'label']])

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize(batch):
    return tokenizer(
        batch['clean_headline'],
        truncation=True,
        padding='max_length',
        max_length=MAX_LEN,
    )

train_dataset = train_dataset.map(tokenize, batched=True, batch_size=1000)
test_dataset  = test_dataset.map(tokenize,  batched=True, batch_size=1000)
train_dataset.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])
test_dataset.set_format('torch',  columns=['input_ids', 'attention_mask', 'label'])

# Load model
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=NUM_LABELS,
    id2label={i: cls for i, cls in enumerate(le.classes_)},
    label2id={cls: i for i, cls in enumerate(le.classes_)},
)

# Metrics
def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = logits.argmax(axis=-1)
    return {
        'f1_macro':    f1_score(labels, preds, average='macro'),
        'f1_weighted': f1_score(labels, preds, average='weighted'),
    }

training_args = TrainingArguments(
    output_dir='./distilbert-news',
    num_train_epochs=EPOCHS,
    per_device_train_batch_size=BATCH_TRAIN,
    per_device_eval_batch_size=BATCH_EVAL,
    fp16=True,                          # ~2x speedup on Kaggle T4/P100
    learning_rate=3e-5,
    warmup_ratio=0.1,
    weight_decay=0.01,
    dataloader_num_workers=4,
    eval_strategy='epoch',
    save_strategy='epoch',
    load_best_model_at_end=True,
    metric_for_best_model='f1_macro',
    greater_is_better=True,
    logging_steps=100,
    report_to='none',
    save_total_limit=2,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=test_dataset,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)],
)

trainer.train()


# ── CELL 15: Final evaluation — DistilBERT ────────────────────────────────────
print("=" * 55)
print("EVALUATION: DistilBERT")
print("=" * 55)

preds_output = trainer.predict(test_dataset)
bert_pred = preds_output.predictions.argmax(axis=-1)
bert_f1   = f1_score(y_test, bert_pred, average='macro')

print(f"\nDistilBERT Test F1 (macro): {bert_f1:.4f}")
print(f"vs. Logistic Regression:    {lr_f1:.4f}  (+{bert_f1-lr_f1:.4f})")
print(f"vs. Linear SVM:             {svm_f1:.4f}  (+{bert_f1-svm_f1:.4f})")
print("\nClassification Report:")
print(classification_report(y_test, bert_pred, target_names=le.classes_))

# Confusion matrix — DistilBERT
cm_bert = confusion_matrix(y_test, bert_pred, normalize='true')
fig, ax = plt.subplots(figsize=(12, 9))
ConfusionMatrixDisplay(confusion_matrix=cm_bert, display_labels=le.classes_).plot(
    ax=ax, cmap='Greens', colorbar=True, xticks_rotation=40
)
ax.set_title('Normalized Confusion Matrix — DistilBERT', fontsize=13, pad=12)
plt.tight_layout()
plt.savefig('confusion_matrix_bert.png', dpi=150, bbox_inches='tight')
plt.show()


# ── CELL 16: LIME explainability (fixed, batched) ─────────────────────────────
from lime.lime_text import LimeTextExplainer

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = model.to(device)
model.eval()

def predict_proba_fn(texts: list[str]) -> np.ndarray:
    """
    Batched prediction function for LIME.
    Processes all LIME perturbations in one forward pass.
    """
    all_probs = []
    batch_size = 32

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        encoded = tokenizer(
            batch,
            return_tensors='pt',
            truncation=True,
            padding=True,
            max_length=64,
        ).to(device)

        with torch.no_grad():
            logits = model(**encoded).logits
            probs  = torch.softmax(logits, dim=-1).cpu().numpy()
        all_probs.append(probs)

    return np.vstack(all_probs)

# Explain 3 examples
lime_explainer = LimeTextExplainer(class_names=list(le.classes_))

for i in [0, 100, 500]:
    text_to_explain = df_test['clean_headline'].iloc[i]
    true_label      = df_test['true'].iloc[i]
    true_label_idx  = int(le.transform([true_label])[0])

    exp = lime_explainer.explain_instance(
        text_to_explain,
        predict_proba_fn,
        num_features=8,
        num_samples=200,        # enough for reliable attributions
        labels=[true_label_idx]
    )

    print(f"\n{'='*60}")
    print(f"Headline : {text_to_explain}")
    print(f"True cat : {true_label}")
    print(f"Weights  : {exp.as_list(label=true_label_idx)}")
    exp.show_in_notebook(text=True, labels=[true_label_idx])


# ── CELL 17: Push best model to HuggingFace Hub ───────────────────────────────
# Replace with your HuggingFace token and repo name
HF_TOKEN   = 'hf_YOUR_TOKEN_HERE'
MODEL_REPO = 'your-username/newssense-distilbert-news'

login(token=HF_TOKEN)

trainer.save_model('./final_model')
tokenizer.save_pretrained('./final_model')

api = HfApi()
api.create_repo(MODEL_REPO, private=False, exist_ok=True)
api.upload_folder(
    folder_path='./final_model',
    repo_id=MODEL_REPO,
    repo_type='model',
)

print(f"\nModel pushed to: https://huggingface.co/{MODEL_REPO}")
print("Update hf-client.ts to use this model for direct inference!")


# ── CELL 18: Final summary ─────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("  NEWSSENSE AI — TRAINING SUMMARY")
print("=" * 65)
print(f"  Dataset            : {len(df):,} headlines, {NUM_LABELS} categories")
print(f"  Train/Test split   : 80/20, stratified")
print(f"  CV F1 (LR, 5-fold) : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
print(f"  Test F1 — LR       : {lr_f1:.4f}")
print(f"  Test F1 — SVM      : {svm_f1:.4f}")
print(f"  Test F1 — DistilBERT: {bert_f1:.4f}")
print(f"  Best model         : DistilBERT (+{bert_f1-max(lr_f1,svm_f1):.4f} vs classical)")
print(f"  HuggingFace Hub    : {MODEL_REPO}")
print("=" * 65)
